package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/unitypark/oatuh2-cognito-best-practice/lambda/api/app/handler"
	"github.com/unitypark/oatuh2-cognito-best-practice/lambda/api/app/router"
	"github.com/unitypark/oatuh2-cognito-best-practice/lambda/api/internal/client"
	appConfig "github.com/unitypark/oatuh2-cognito-best-practice/lambda/api/internal/config"
	zapLogger "github.com/unitypark/oatuh2-cognito-best-practice/lambda/api/internal/logger"
	"github.com/unitypark/oatuh2-cognito-best-practice/lambda/api/internal/repository"
	"github.com/unitypark/oatuh2-cognito-best-practice/lambda/api/internal/service"
	"go.uber.org/zap"
)

const serviceName string = "PostDownloads"

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
	lambdaHandler = handler.NewApiHandler(serviceName, fiberLambda)
	zap.L().Info("lambda cold start")
}

func main() {
	var (
		dynamodbClient, _ = client.Connect(config)
		repo              = repository.NewRepository(dynamodbClient)
		fileShareService  = service.NewFileShareService(config, repo)
	)
	fiberApp.Post("/api/downloads", router.PostDownloadUrl(fileShareService))

	if config.Env == appConfig.Local {
		zap.L().Debug("start local server on port 8080", zap.Error(fiberApp.Listen(":8080")))
	} else {
		zap.L().Debug("start lambda for production")
		// Make the handler available for Remote Procedure Call by AWS Lambda
		lambda.Start(lambdaHandler.HandleAPIGatewayV2HTTPRequest)
	}
}
