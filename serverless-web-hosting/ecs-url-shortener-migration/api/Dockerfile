FROM golang:1.18 as build

WORKDIR /go-fiber/src/api

# Copy the Go Modules manifests
COPY go.mod go.sum ./
# cache deps before building and copying source so that we don't need to re-download as much
# and so that source changes don't invalidate our downloaded layer
RUN go mod download

COPY . .
#COPY app ./app/
#COPY cmd ./cmd/
#COPY internal ./internal/
RUN ls -l

# build
RUN cd ./cmd && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /go-fiber/bin/api

# copy artifacts to a distroless image
FROM gcr.io/distroless/static-debian11
COPY --from=build /go-fiber/bin/api /
CMD [ "/api" ]	
