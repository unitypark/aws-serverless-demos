package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
	"github.com/deloittepark/serverless-file-share/app/handler"
	"github.com/deloittepark/serverless-file-share/app/router"
	"github.com/deloittepark/serverless-file-share/internal/client"
	appConfig "github.com/deloittepark/serverless-file-share/internal/config"
	zapLogger "github.com/deloittepark/serverless-file-share/internal/logger"
	"github.com/deloittepark/serverless-file-share/internal/repository"
	"github.com/deloittepark/serverless-file-share/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"go.uber.org/zap"
)

const serviceName string = "GetUrl"

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
		fileShareService  = service.NewFileShareService(config, repo)
	)
	fiberApp.Get("/downloads/:key", router.PostDownloadUrl(fileShareService))

	if config.Env == appConfig.Local {
		zap.L().Debug("start local server on port 8080", zap.Error(fiberApp.Listen(":8080")))
	} else {
		zap.L().Debug("start lambda for production")
		// Make the handler available for Remote Procedure Call by AWS Lambda
		lambda.Start(lambdaHandler.HandleAPIGatewayProxyRequest)
	}
}
