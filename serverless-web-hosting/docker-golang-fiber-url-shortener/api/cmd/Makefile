.PHONY : build

zip :
	GOOS=linux GOARCH=arm64 go build -o bootstrap
	zip handler.zip bootstrap
	rm bootstrap
# https://stackoverflow.com/questions/36279253/go-compiled-binary-wont-run-in-an-alpine-docker-container-on-ubuntu-host
build :
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ../api