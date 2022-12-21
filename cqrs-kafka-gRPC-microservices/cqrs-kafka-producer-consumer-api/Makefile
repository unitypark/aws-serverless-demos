.PHONY:

run_api_gateway:
	go run api_service/cmd/main.go -config=./api_service/config/config.yaml

run_consumer_logger:
	go run consumer_logger/consumer.go 

# ==============================================================================
# Docker

docker_dev:
	@echo Starting local docker dev compose
	docker compose -f docker-compose.yml up --build

docker_local:
	@echo Starting local docker compose
	docker compose -f docker-compose.local.yml up -d --build


# ==============================================================================
# Docker support

FILES := $(shell docker ps -aq)

down-local:
	docker stop $(FILES)
	docker rm $(FILES)

clean:
	docker rm -vf $$(docker ps -aq)
	docker rmi -f $$(docker images -aq)
	docker system prune -f

logs-local:
	docker logs -f $(FILES)


# ==============================================================================
# Modules support

tidy:
	go mod tidy

deps-reset:
	git checkout -- go.mod
	go mod tidy

deps-upgrade:
	go get -u -t -d -v ./...
	go mod tidy

deps-cleancache:
	go clean -modcache


# ==============================================================================
# Linters https://golangci-lint.run/usage/install/

run-linter:
	@echo Starting linters
	golangci-lint run ./...

# ==============================================================================
# Swagger

swagger:
	@echo Starting swagger generating
	swag init -g **/**/*.go
