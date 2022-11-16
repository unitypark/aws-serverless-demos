FROM golang:1.18-alpine3.16 AS builder

WORKDIR /go-fiber

# Copy the Go Modules manifests
COPY go.mod go.sum ./
# cache deps before building and copying source so that we don't need to re-download as much
# and so that source changes don't invalidate our downloaded layer
RUN go mod download

COPY app ./app/
COPY cmd ./cmd/
COPY internal ./internal/
RUN ls -l

# build
RUN cd ./cmd && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" main.go && ls -l

# copy artifacts to a clean image
FROM alpine:3.16
COPY --from=builder /go-fiber/cmd/main /go-fiber/cmd/main
RUN ls -l
ENTRYPOINT [ "/go-fiber/cmd/main" ]	
