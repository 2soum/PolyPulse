.PHONY: install test coverage lint build up down clean

SERVICES = services/sky-service services/spot-service

install: ## Install dependencies for both services
	cd services/sky-service && npm ci
	cd services/spot-service && npm ci

test: ## Run unit + integration tests for both services
	cd services/sky-service && npm test
	cd services/spot-service && npm test

coverage: ## Run tests with coverage reports
	cd services/sky-service && npm run test:coverage
	cd services/spot-service && npm run test:coverage

lint: ## Lint both services
	cd services/sky-service && npm run lint
	cd services/spot-service && npm run lint

build: ## Compile TypeScript for both services
	cd services/sky-service && npm run build
	cd services/spot-service && npm run build

up: ## Start the full stack (2 services + Postgres + frontend)
	docker compose up --build

down: ## Stop the stack
	docker compose down

clean: ## Remove build artefacts and volumes
	docker compose down -v
	rm -rf services/*/dist services/*/coverage services/*/node_modules
