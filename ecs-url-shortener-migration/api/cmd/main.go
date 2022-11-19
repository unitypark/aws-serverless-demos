package main

import (
	"github.com/deloittepark/ecs-url-shortener/app/router"
	"github.com/deloittepark/ecs-url-shortener/internal/client"
	appConfig "github.com/deloittepark/ecs-url-shortener/internal/config"
	zapLogger "github.com/deloittepark/ecs-url-shortener/internal/logger"
	"github.com/deloittepark/ecs-url-shortener/internal/repository"
	"github.com/deloittepark/ecs-url-shortener/internal/service"
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

	if config.Env == appConfig.Local {
		zap.L().Info("host api in local")
		if err := repo.Init(); err != nil {
			zap.L().Panic("unexpected error during initializing local dynamodb", zap.Error(err))
		}
	} else {
		zap.L().Info("host api in aws")
	}
	zap.L().Info("start local server on port 8080", zap.Error(fiberApp.Listen(":8080")))
}
