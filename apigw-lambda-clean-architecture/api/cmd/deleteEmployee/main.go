package main

import (
	"github.com/aws/aws-lambda-go/lambda"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
	"github.com/deloittepark/apigw-lambda-clean-architecture/app/handler"
	"github.com/deloittepark/apigw-lambda-clean-architecture/app/router"
	"github.com/deloittepark/apigw-lambda-clean-architecture/internal/client"
	appConfig "github.com/deloittepark/apigw-lambda-clean-architecture/internal/config"
	zapLogger "github.com/deloittepark/apigw-lambda-clean-architecture/internal/logger"
	"github.com/deloittepark/apigw-lambda-clean-architecture/internal/repository"
	"github.com/deloittepark/apigw-lambda-clean-architecture/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"go.uber.org/zap"
)

const serviceName string = "DeleteEmployee"

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
		employeeService   = service.NewEmployeeService(repo)
	)

	if config.Env == appConfig.Local {
		api := fiberApp.Group("/")
		router.EmployeeRouter(api, employeeService)
		zap.L().Debug("start local server on port 8080", zap.Error(fiberApp.Listen(":8080")))
	} else {
		zap.L().Info("start lambda for production")
		fiberApp.Get("/employees", router.RemoveEmployee(employeeService))
		// Make the handler available for Remote Procedure Call by AWS Lambda
		lambda.Start(lambdaHandler.HandleAPIGatewayProxyRequest)
	}
}
