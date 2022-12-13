package main

import (
	"github.com/deloittepark/ecs-url-shortener-api/app/router"
	"github.com/deloittepark/ecs-url-shortener-api/internal/client"
	appConfig "github.com/deloittepark/ecs-url-shortener-api/internal/config"
	zapLogger "github.com/deloittepark/ecs-url-shortener-api/internal/logger"
	"github.com/deloittepark/ecs-url-shortener-api/internal/repository"
	"github.com/deloittepark/ecs-url-shortener-api/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"go.uber.org/zap"
)

var (
	config   *appConfig.Config
	fiberApp *fiber.App
)

func init() {
	config = appConfig.New()
	zapLogger.Init(config.Env)

	fiberApp = fiber.New()
	fiberApp.Use(cors.New())
	fiberApp.Use(logger.New())

	zap.L().Info("lambda cold start")
}

func main() {
	var (
		dynamodbClient, _ = client.Connect(config)
		repo              = repository.NewRepository(dynamodbClient)
		urlService        = service.NewUrlService(repo)
		api               = fiberApp.Group("/")
	)
	router.UrlRouter(api, urlService)

	if err := repo.Init(); err != nil {
		zap.L().Panic("unexpected error during initializing local dynamodb", zap.Error(err))
	}
	zap.L().Info("start local server on port 8080", zap.Error(fiberApp.Listen(":8080")))
}
