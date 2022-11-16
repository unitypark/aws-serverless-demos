package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/app/handler"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/app/router"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/internal/client"
	appConfig "github.com/deloittepark/docker-golang-fiber-url-shortener/internal/config"
	zapLogger "github.com/deloittepark/docker-golang-fiber-url-shortener/internal/logger"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/internal/repository"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"go.uber.org/zap"
)

const serviceName string = "UrlShortener"

var (
	config        *appConfig.Config
	fiberApp      *fiber.App
	fiberLambda   *fiberadapter.FiberLambda
	lambdaHandler handler.FiberLambdaHandler
)

func init() {
	config = appConfig.New()
	zapLogger.Init(config.Env)

	fiberApp = fiber.New()
	fiberApp.Use(cors.New())
	fiberApp.Use(logger.New())

	fiberLambda = fiberadapter.New(fiberApp)
	lambdaHandler = handler.NewHandler(serviceName, fiberLambda)
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
		if err := repo.Init(); err != nil {
			zap.L().Panic("unexpected error during initializing local dynamodb", zap.Error(err))
		}
		zap.L().Info("start local server on port 8080", zap.Error(fiberApp.Listen(":8080")))
	} else {
		zap.L().Info("start lambda function")
		// Make the handler available for Remote Procedure Call by AWS Lambda
		lambda.Start(lambdaHandler.HandleAPIGatewayProxyRequest)
	}
}
