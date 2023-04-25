package main

import (
	"context"

	"github.com/unitypark/serverless-web-hosting/customresource/internal/config"
	"github.com/unitypark/serverless-web-hosting/customresource/internal/dynamodb"
	"github.com/unitypark/serverless-web-hosting/customresource/internal/handler"
	"github.com/unitypark/serverless-web-hosting/customresource/internal/logger"
	"github.com/unitypark/serverless-web-hosting/customresource/internal/service"

	"github.com/aws/aws-lambda-go/cfn"
	"github.com/aws/aws-lambda-go/lambda"
)

func init() {
	logger.Init()
}

func main() {
	var (
		onEventService = service.NewOnEventService(
			config.New(),
			dynamodb.NewDynamoDBService(context.Background()),
		)
		register = handler.NewCustomResourceFunctionRegister(onEventService)
	)
	lambda.Start(cfn.LambdaWrap(register.ResolveEventRequest))
}
