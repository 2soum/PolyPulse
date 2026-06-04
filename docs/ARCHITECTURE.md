# Architecture logicielle — PolyPulse

## 1. Vue d'ensemble (micro-services)

```mermaid
flowchart LR
    UI[Dashboard<br/>nginx :8080]
    WATCH[watch-service<br/>Express :3001]
    POLY[poly-service<br/>Express :3002]
    DB[(PostgreSQL)]
    GAMMA[[Polymarket Gamma<br/>API externe]]

    UI -->|REST /api| WATCH
    WATCH -->|REST /api/markets| POLY
    WATCH -->|SQL| DB
    POLY -->|HTTP /markets| GAMMA
```

`watch-service` porte le domaine (watchlist, snapshots, KPIs) ; `poly-service` est un service de
calcul sans état qui encapsule l'API Polymarket et détecte les marchés boostés.

## 2. Architecture en couches (par service)

```mermaid
flowchart TB
    subgraph watch-service
        C1[Controller<br/>watchController.ts]
        S1[Services<br/>watchService.ts / polyGateway.ts]
        D1[Data<br/>WatchRepository · SnapshotRepository<br/>InMemory · Postgres]
        C1 --> S1 --> D1
    end
    subgraph poly-service
        C2[Controller<br/>marketController.ts]
        S2[Services<br/>marketService.ts / polymarketClient.ts / marketNormalizer.ts]
        D2[Data<br/>CategoryRepository]
        C2 --> S2 --> D2
    end
```

**Règle de dépendance :** chaque couche ne dépend que de la couche inférieure, via une
**interface** (`WatchRepository`, `SnapshotRepository`, `PolymarketClient`, `PolyGateway`,
`CategoryRepository`). Les implémentations en mémoire et PostgreSQL sont interchangeables.

## 3. Détection « boosté » et score

```
boosted = rewardsMinSize > 0  OU  holdingRewardsEnabled
score   = 40·(rewardsMinSize>0) + 40·(holdingRewards) + 20·min(1, rewardsMaxSpread/5)   # [0,100]
```

## 4. Séquence : ajouter un marché et rafraîchir le dashboard

```mermaid
sequenceDiagram
    participant U as Dashboard
    participant W as watch-service
    participant P as poly-service
    participant G as Polymarket Gamma

    U->>W: POST /api/watchlist { marketId }
    W->>P: GET /api/markets/{id}
    P->>G: GET /markets/{id}
    G-->>P: marché brut
    P-->>W: marché normalisé (+ boost, catégorie)
    W->>W: enregistre (watchlist + 1er snapshot) [Postgres]
    U->>W: GET /api/dashboard
    W->>P: GET /api/markets/{id} (par marché suivi)
    W->>W: snapshot + agrégation KPIs
    W-->>U: { kpis, rows[] (sparklines) }
```

## 5. Stratégie de test par couche

| Couche        | Type de test       | Outils           | Exemple                              |
| ------------- | ------------------ | ---------------- | ------------------------------------ |
| Data          | unitaire           | Jest             | `categoryRepository.test.ts`, `repositories.test.ts` |
| Services      | unitaire + mocks   | Jest, nock       | `marketNormalizer.test.ts`, `watchService.test.ts` |
| Controller    | intégration HTTP   | Supertest + nock | `marketController.test.ts`, `watchController.test.ts` |
| Inter-service | mock web           | nock             | `polyGateway.test.ts`                |

Les **mocks web (nock)** interceptent les deux frontières HTTP : l'API Polymarket Gamma (externe)
et l'appel `watch-service → poly-service`, pour des tests isolés et déterministes.
