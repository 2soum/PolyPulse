# 🔭 AstroSpot — Planificateur de soirées d'observation des étoiles

Projet **DevOps** — application répartie en deux micro-services back qui collaborent pour
répondre à une question simple : **« Vaut-il la peine de sortir le télescope ce soir, à cet endroit ? »**

AstroSpot croise deux facteurs : la **pollution lumineuse** (échelle de Bortle) du site le plus
proche et la **couverture nuageuse** prévue (API météo externe), pour produire un **score de
qualité du ciel** de 0 à 100 et une recommandation.

---

## 🎯 Cas d'usage

1. L'utilisateur enregistre des **spots d'observation** (nom, coordonnées) via `spot-service`.
2. Il demande une **planification** pour une date : `spot-service` appelle `sky-service`.
3. `sky-service` combine sa base de **pollution lumineuse** (couche Data) avec la **météo**
   récupérée auprès d'un fournisseur **externe** (Open-Meteo) et renvoie un score + une note.
4. Le **front web** affiche le verdict : ✅ « Sortez les télescopes » ou ⛅ « Mieux vaut attendre ».

Ce découpage crée **deux frontières HTTP distinctes** — `spot-service → sky-service` et
`sky-service → fournisseur météo` — qui justifient pleinement les **mocks web** demandés.

---

## 🏗️ Architecture

```
                ┌───────────────┐   HTTP    ┌──────────────┐   HTTP   ┌──────────────────┐
   Navigateur ─▶│  spot-service │ ───────▶  │  sky-service │ ──────▶  │ Open-Meteo (ext.)│
   (front web)  │   port 3001   │  /assess  │   port 3002  │ /forecast│  météo            │
                └──────┬────────┘           └──────┬───────┘          └──────────────────┘
                       │                           │
                 ┌─────▼─────┐               ┌─────▼──────────────┐
                 │ PostgreSQL│               │ Catalogue pollution│
                 │  (spots)  │               │ lumineuse (in-mem) │
                 └───────────┘               └────────────────────┘
```

Chaque service respecte une **architecture en couches** stricte :

| Couche              | `spot-service`                          | `sky-service`                              |
| ------------------- | --------------------------------------- | ------------------------------------------ |
| **Controller (web)**| `controller/spotController.ts`          | `controller/skyController.ts`              |
| **Services**        | `services/spotService.ts`, `skyClient`  | `services/skyConditionsService.ts`, `weatherClient` |
| **Data**            | `data/spotRepository.ts` (+ Postgres)   | `data/lightPollutionRepository.ts`         |

> Schéma détaillé et diagramme de séquence : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🚀 Démarrage

### Tout-en-un (Docker)

```bash
make up           # docker compose up --build
# Front      : http://localhost:8080
# spot-service: http://localhost:3001/health
# sky-service : http://localhost:3002/health
```

### En local (sans Docker)

```bash
make install      # npm ci dans les deux services
# Terminal 1
cd services/sky-service && npm run dev      # port 3002
# Terminal 2
cd services/spot-service && npm run dev     # port 3001 (in-memory, sans Postgres)
# Terminal 3 : servir le front
cd frontend && python3 -m http.server 8080
```

---

## ✅ Tests, couverture & qualité

```bash
make coverage     # tests + rapport de couverture des deux services
make lint         # ESLint (TypeScript strict)
```

| Service        | Tests | Couverture (lignes) | Couverture (branches) |
| -------------- | ----- | ------------------- | --------------------- |
| `sky-service`  | 30    | **100 %**           | 92.6 %                |
| `spot-service` | 26    | **98 %**            | 94.1 %                |

**Stack de test :** [Jest](https://jestjs.io) (tests unitaires), [Supertest](https://github.com/ladjs/supertest)
(tests HTTP de la couche Controller), [nock](https://github.com/nock/nock) (**mocks web** : le
fournisseur météo externe *et* l'appel inter-service `spot → sky` sont simulés).

Les rapports HTML de couverture sont générés dans `services/*/coverage/lcov-report/index.html`
et publiés comme artefacts par la CI.

---

## 🔁 Pipeline CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) — à chaque *push* / *pull request* :

1. **matrice** sur les deux services → `npm ci`, `lint`, `build`, `test:coverage` ;
2. publication des rapports de couverture en artefacts ;
3. **build des images Docker** (`sky-service`, `spot-service`, `frontend`) + validation `docker compose`.

> Pas de Continuous Delivery (hors programme) : la CI s'arrête au build/test/qualité.

---

## 🧱 Conformité au sujet

| Exigence                               | Réalisation                                                            |
| -------------------------------------- | --------------------------------------------------------------------- |
| Dépôt Git                              | ✅ ce dépôt                                                            |
| Pipeline CI                            | ✅ GitHub Actions (lint + build + test + docker)                       |
| Architecture en couches (Data/Services/Controller) | ✅ stricte dans les deux services                         |
| ≥ 2 services back avec Docker          | ✅ `spot-service` + `sky-service`, `docker-compose.yml`                |
| Tests de toutes les couches           | ✅ Data, Services, Controller couverts                                 |
| Framework de tests unitaires          | ✅ Jest                                                                |
| Mocks web                              | ✅ nock (météo externe + inter-service) + Supertest                    |
| Bonne couverture de code              | ✅ ≥ 98 % lignes, seuils imposés (`coverageThreshold`)                 |
| Qualité logicielle élevée             | ✅ TypeScript `strict`, ESLint, Prettier, repositories découplés       |
| **Bonus** Front web                    | ✅ `frontend/` (HTML/CSS/JS, servi par nginx)                          |
| **Bonus** Base de données              | ✅ PostgreSQL (`PostgresSpotRepository`)                               |

---

## ⚠️ Limites connues

- Le fournisseur météo (Open-Meteo) ne fournit de prévisions que sur **~16 jours**. Au-delà,
  `sky-service` renvoie `502` (dégradation gracieuse, testée) plutôt qu'un score erroné.
- Le catalogue de pollution lumineuse est volontairement réduit à quelques sites français
  (couche Data en mémoire) — facilement remplaçable par une vraie base.

## 📁 Structure

```
.
├── docker-compose.yml            # 2 services + Postgres + front
├── Makefile                      # raccourcis (install/test/coverage/up...)
├── .github/workflows/ci.yml      # pipeline CI
├── docs/ARCHITECTURE.md          # schémas (couches + séquence)
├── frontend/                     # bonus : front web
└── services/
    ├── sky-service/              # météo + pollution lumineuse -> score
    └── spot-service/             # spots, sessions, planification (Postgres)
```
