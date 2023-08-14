help:
	$(info This Makefile holds a utility toolset for handling golang integration)

check:
	go mod tidy -v
	go fmt ./...
	go vet ./...

## It cleans up all manual zipped Lambdas (Makefiles in cmd) / fake files
clean :
	find . -type f -name '*.zip' -delete
	find . -type f -name '*fake_*.go' -delete
	find . -type d -name '*fakes' -delete

## It ensures that the go.mod file matches the source code in the module. 
## It adds any missing module requirements necessary to build the current module's packages and dependencies, and it removes requirements on modules that don't provide any relevant packages. 
## It also adds any missing entries to go.sum and removes unnecessary entries.
tidy: 
	go mod tidy -v


vet:    ## run go vet on the source files
	go vet ./...


fmt:    ## format the go source files
	go fmt ./...

## This upgrades to the latest or minor patch release
upgrade:
	go get -u ./...

lint:
	curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.44.0
	$(go env GOPATH)/bin/golangci-lint run

## It generates fake files of counterfeiter for unit testing
fakes:
	go generate ./...

## It runs the unit test and creates a coverage report
test:
	go generate ./...
	go test ./... -v -coverprofile=coverage.out
	go tool cover -html=coverage.out

coverage:
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out

plantuml: 
	go install github.com/jfeliu007/goplantuml/cmd/goplantuml@latest
	goplantuml -recursive internal/app > docs/diagrams/src/internal_app.puml
	goplantuml -recursive internal/config > docs/diagrams/src/internal_config.puml
	goplantuml -recursive internal/datastruct > docs/diagrams/src/internal_datastruct.puml
	goplantuml -recursive internal/dto > docs/diagrams/src/internal_dto.puml
	goplantuml -recursive internal/log > docs/diagrams/src/internal_log.puml
	goplantuml -recursive internal/repository/db > docs/diagrams/src/internal_db.puml
	goplantuml -recursive internal/repository/account > docs/diagrams/src/internal_account_repo.puml
	goplantuml -recursive internal/repository/user > docs/diagrams/src/internal_user_repo.puml
	goplantuml -recursive internal/repository/admin > docs/diagrams/src/internal_admin_repo.puml
	goplantuml -recursive internal/service/account > docs/diagrams/src/internal_account_service.puml
	goplantuml -recursive internal/service/user > docs/diagrams/src/internal_user_service.puml
	goplantuml -recursive internal/service/admin > docs/diagrams/src/internal_admin_service.puml
	goplantuml -recursive internal/service/federation > docs/diagrams/src/internal_federation_service.puml