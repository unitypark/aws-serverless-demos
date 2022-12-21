FROM golang:1.18 AS builder

# Move to working directory (/build).
WORKDIR /build

# Copy the Go Modules manifests
COPY go.mod go.sum ./
# cache deps before building and copying source so that we don't need to re-download as much
# and so that source changes don't invalidate our downloaded layer
RUN go mod download

COPY . .

RUN ls -l

# Set necessary environment variables needed for our image and build the API server.
ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64
RUN cd ./api_service/cmd && go build -ldflags="-s -w" -o ../api .

# copy artifacts to a distroless image
FROM gcr.io/distroless/static-debian11

# Copy binary and config files from /build to root folder of scratch container.
COPY --from=builder /build/api_service/api /
COPY --from=builder /build/api_service/config/config.yaml /

# Command to run when starting the container.
ENTRYPOINT [ "/api" ]
