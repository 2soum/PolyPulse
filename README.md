# 🟢 PolyPulse — Surveillance des marchés boostés sur Polymarket

Projet **DevOps** — application répartie en deux micro-services back qui collaborent pour
**surveiller les marchés de prédiction « boostés »** de [Polymarket](https://polymarket.com)
(ceux qui offrent des récompenses de liquidité) et les afficher dans un **dashboard** temps réel.

---

## 🎯 Cas d'usage

Sur Polymarket, certains marchés sont **boostés** : ils distribuent des récompenses aux apporteurs
de liquidité (`rewardsMinSize`, `holdingRewardsEnabled`). PolyPulse permet de :

1. **découvrir** les marchés boostés les plus actifs (volume 24h) ;
2. les **ajouter à une watchlist** (persistée en base) ;
3. suivre dans un **dashboard** : cote « Oui », variation 24h, volume, **boost score**, **courbe
   d'évolution** (snapshots), **répartition par catégorie**.

`watch-service` interroge `poly-service`, qui interroge l'**API externe Polymarket Gamma** : deux
frontières HTTP → les **mocks web** demandés par le sujet sont pleinement justifiés.

---

## 🏗️ Architecture

```
              ┌────────────────┐  HTTP   ┌───────────────┐  HTTP   ┌────────────────────┐
  Dashboard ─▶│  watch-service │ ──────▶ │  poly-service │ ──────▶ │ Polymarket Gamma   │
   (nginx)    │   :3001        │ /markets│   :3002       │/markets │ API (externe)      │
              └──────┬─────────┘         └───────┬───────┘         └────────────────────┘
                     │                           │
              ┌──────▼──────┐            ┌────────▼─────────┐
              │ PostgreSQL  │            │ Catalogue de     │
              │ watchlist + │            │ catégories       │
              │ snapshots   │            │ (couche Data)    │
              └─────────────┘            └──────────────────┘
```

Architecture **en couches** stricte dans chaque service :

| Couche               | `watch-service`                                | `poly-service`                                  |
| -------------------- | ---------------------------------------------- | ----------------------------------------------- |
| **Controller (web)** | `controller/watchController.ts`                | `controller/marketController.ts`                |
| **Services**         | `services/watchService.ts`, `polyGateway.ts`   | `services/marketService.ts`, `polymarketClient.ts`, `marketNormalizer.ts` |
| **Data**             | `data/watchRepository.ts`, `snapshotRepository.ts` (+ Postgres) | `data/categoryRepository.ts`   |

> Schémas détaillés (couches + séquence) : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

**Boost score** (0–100, explicable) :
`40·(LP rewards) + 40·(holding rewards) + 20·min(1, rewardsMaxSpread/5)`.

---

## 🚀 Démarrage

```bash
make up        # docker compose up --build
# Dashboard     : http://localhost:8080
# watch-service : http://localhost:3001/health
# poly-service  : http://localhost:3002/health
```

En local sans Docker : `make install`, puis `npm run dev` dans chaque service (watch-service en
mémoire si `DATABASE_URL` absent), et servir `frontend/` (`python3 -m http.server 8080`).

---

## ✅ Tests, couverture & qualité

```bash
make coverage   # rapports HTML dans services/*/coverage/lcov-report/index.html
make lint
```

| Service         | Tests | Couverture (lignes) | Branches |
| --------------- | ----- | ------------------- | -------- |
| `poly-service`  | 40    | **97.9 %**          | 91.8 %   |
| `watch-service` | 36    | **97.1 %**          | 94.2 %   |

**Stack de test :** Jest (unitaire), Supertest (Controller HTTP), **nock** (mocks web : API
Polymarket externe **et** appel inter-service `watch → poly`). Seuils imposés via
`coverageThreshold` (la CI échoue sous le seuil).

---

## 🔁 Pipeline CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) — à chaque push / PR :
matrice sur les 2 services (`npm ci` → `lint` → `build` → `test:coverage`), artefacts de
couverture, puis build des 3 images Docker + validation `docker compose`.

---

## 🧱 Conformité au sujet

| Exigence                                | Réalisation                                              |
| --------------------------------------- | -------------------------------------------------------- |
| Dépôt Git                               | ✅                                                       |
| Pipeline CI                             | ✅ GitHub Actions                                        |
| Architecture en couches                 | ✅ Data / Services / Controller                          |
| ≥ 2 services back avec Docker           | ✅ `poly-service` + `watch-service`                      |
| Tests de toutes les couches             | ✅ Jest + Supertest + nock                               |
| Mocks web                               | ✅ Polymarket externe + inter-service                    |
| Bonne couverture                        | ✅ ~97 % lignes, seuils imposés                          |
| Qualité élevée                          | ✅ TypeScript strict, ESLint, Prettier                   |
| **Bonus** Front web                     | ✅ dashboard (graphes, sparklines, filtres)              |
| **Bonus** Base de données               | ✅ PostgreSQL (watchlist + snapshots)                    |

---

## 📁 Structure

```
.
├── docker-compose.yml            # 2 services + Postgres + dashboard
├── Makefile                      # install / test / coverage / up …
├── .github/workflows/ci.yml      # pipeline CI
├── docs/ARCHITECTURE.md          # schémas
├── frontend/                     # dashboard (HTML/CSS/JS, nginx)
└── services/
    ├── poly-service/             # gateway Polymarket + détection boost
    └── watch-service/            # watchlist + snapshots (Postgres) + KPIs
```
