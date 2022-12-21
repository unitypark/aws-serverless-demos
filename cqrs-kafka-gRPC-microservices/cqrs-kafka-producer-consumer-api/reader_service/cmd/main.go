package main

import (
	"flag"
	"log"

	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	"github.com/deloittepark/cqrs-microservices/reader_service/config"
	"github.com/deloittepark/cqrs-microservices/reader_service/internal/server"
)

func main() {
	flag.Parse()

	cfg, err := config.InitConfig()
	if err != nil {
		log.Fatal(err)
	}

	appLogger := logger.NewAppLogger(cfg.Logger)
	appLogger.InitLogger()
	appLogger.WithName("ReaderService")

	s := server.NewServer(appLogger, cfg)
	appLogger.Fatal(s.Run())
}
