package main

import (
	"flag"
	"log"

	"github.com/deloittepark/cqrs-microservices/api_service/config"
	"github.com/deloittepark/cqrs-microservices/api_service/internal/server"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
)

// @title           Swagger API for Todo Service
// @version         1.0
// @description     This is a sample server celler server.

// @contact.name Junghwa Park
// @contact.url https://github.com/deloittepark/aws-serverless-golang
// @contact.linkedIn https://www.linkedin.com/in/junghwa-park-279129235/
func main() {
	flag.Parse()

	cfg, err := config.InitConfig()
	if err != nil {
		log.Fatal(err)
	}

	appLogger := logger.NewAppLogger(cfg.Logger)
	appLogger.InitLogger()
	appLogger.WithName("ApiGateway")

	s := server.NewServer(appLogger, cfg)
	appLogger.Fatal(s.Run())
}
