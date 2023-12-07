package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/app/handler"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/app/router"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/client"
	appConfig "github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/config"
	zapLogger "github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/logger"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/repository"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/service"
	"go.uber.org/zap"
)

const serviceName string = "IndexSearch"

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
	zap.L().Info("initialize app")
}

func main() {
	openSearchClient, err := client.New(config)
	if err != nil {
		zap.L().Fatal("failed to initialize opensearch client", zap.Error(err))
	}

	openSearchRepository := repository.NewOpenSearchRepository(openSearchClient)
	openSearchService := service.NewOpenSearchService(config, openSearchRepository)
	router.RouteIndexSearch(fiberApp, openSearchService)

	if config.Env == appConfig.Local {
		zap.L().Debug("start local server on port 8080", zap.Error(fiberApp.Listen("localhost:8080")))
	} else {
		zap.L().Info("start lambda for production")
		// Make the handler available for Remote Procedure Call by AWS Lambda
		lambda.Start(lambdaHandler.HandleAPIGatewayV2HTTPRequest)
	}
}
