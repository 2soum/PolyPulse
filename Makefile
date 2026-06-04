.PHONY: install test coverage lint build up down clean

install: ## Install dependencies for both services
	cd services/poly-service && npm ci
	cd services/watch-service && npm ci

test: ## Run unit + integration tests for both services
	cd services/poly-service && npm test
	cd services/watch-service && npm test

coverage: ## Run tests with coverage reports
	cd services/poly-service && npm run test:coverage
	cd services/watch-service && npm run test:coverage

lint: ## Lint both services
	cd services/poly-service && npm run lint
	cd services/watch-service && npm run lint

build: ## Compile TypeScript for both services
	cd services/poly-service && npm run build
	cd services/watch-service && npm run build

up: ## Start the full stack (2 services + Postgres + dashboard)
	docker compose up --build

down: ## Stop the stack
	docker compose down

clean: ## Remove build artefacts and volumes
	docker compose down -v
	rm -rf services/*/dist services/*/coverage services/*/node_modules
