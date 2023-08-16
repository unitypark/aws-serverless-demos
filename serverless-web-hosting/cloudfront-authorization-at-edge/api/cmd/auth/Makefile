.PHONY : build

build :
	GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o bootstrap
	zip handler.zip bootstrap
	rm bootstrap