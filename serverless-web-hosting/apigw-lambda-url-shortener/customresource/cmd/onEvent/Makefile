.PHONY : build

build :
	GOOS=linux GOARCH=arm64 go build -o bootstrap
	zip handler.zip bootstrap
	rm bootstrap