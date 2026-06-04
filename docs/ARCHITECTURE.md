# Architecture logicielle — AstroSpot

## 1. Vue d'ensemble (micro-services)

```mermaid
flowchart LR
    UI[Front web<br/>nginx :8080]
    SPOT[spot-service<br/>Express :3001]
    SKY[sky-service<br/>Express :3002]
    DB[(PostgreSQL)]
    WX[[Open-Meteo<br/>API externe]]

    UI -->|REST /api/spots| SPOT
    SPOT -->|REST /api/sky/assess| SKY
    SPOT -->|SQL| DB
    SKY -->|HTTP /v1/forecast| WX
```

Deux services back indépendants, conteneurisés et orchestrés par `docker-compose`.
`spot-service` est le service de domaine (spots & planification) ; `sky-service` est un
service de calcul (qualité du ciel) réutilisable et sans état.

## 2. Architecture en couches (par service)

```mermaid
flowchart TB
    subgraph spot-service
        C1[Controller<br/>spotController.ts]
        S1[Services<br/>spotService.ts / skyClient.ts]
        D1[Data<br/>SpotRepository<br/>InMemory · Postgres]
        C1 --> S1 --> D1
    end
    subgraph sky-service
        C2[Controller<br/>skyController.ts]
        S2[Services<br/>skyConditionsService.ts / weatherClient.ts]
        D2[Data<br/>LightPollutionRepository]
        C2 --> S2 --> D2
    end
```

**Règle de dépendance :** une couche ne dépend que de la couche immédiatement inférieure,
et toujours via une **interface** (`SpotRepository`, `WeatherClient`, `SkyGateway`). C'est
ce découplage qui rend chaque couche testable isolément et permet de substituer
l'implémentation en mémoire par PostgreSQL sans toucher au reste.

## 3. Calcul du score de qualité du ciel

```
lightScore = (9 − bortleClass) / 8 × 100      # Bortle 1 (ciel pur) -> 100, Bortle 9 (ville) -> 0
cloudScore = 100 − couvertureNuageuseMoyenne  # %
score      = round(0.5 × lightScore + 0.5 × cloudScore)   # borné [0, 100]

rating  = EXCELLENT (≥80) | GOOD (≥60) | FAIR (≥40) | POOR (<40)
recommended = score ≥ 60
```

## 4. Séquence : planifier une observation

```mermaid
sequenceDiagram
    participant U as Front web
    participant SP as spot-service
    participant SK as sky-service
    participant WX as Open-Meteo

    U->>SP: POST /api/spots/{id}/plan { date }
    SP->>SP: get(spot) depuis le repository
    SP->>SK: GET /api/sky/assess?lat&lon&date
    SK->>SK: findNearest(bortle) [Data]
    SK->>WX: GET /v1/forecast (cloudcover)
    WX-->>SK: couverture nuageuse horaire
    SK-->>SP: { score, rating, recommended }
    SP-->>U: { spot, date, assessment, recommended }
```

## 5. Stratégie de test par couche

| Couche      | Type de test          | Outils                       | Exemple de fichier                         |
| ----------- | --------------------- | ---------------------------- | ------------------------------------------ |
| Data        | unitaire              | Jest                         | `lightPollutionRepository.test.ts`         |
| Services    | unitaire + mocks      | Jest (jest.fn), nock         | `skyConditionsService.test.ts`, `weatherClient.test.ts` |
| Controller  | intégration HTTP      | Supertest + nock             | `skyController.test.ts`, `spotController.test.ts` |
| Inter-service | mock web            | nock                         | `skyClient.test.ts`                        |

Les **mocks web (nock)** interceptent les deux frontières HTTP : l'API météo externe et
l'appel `spot-service → sky-service`, ce qui permet de tester chaque service de façon
totalement isolée et déterministe.
