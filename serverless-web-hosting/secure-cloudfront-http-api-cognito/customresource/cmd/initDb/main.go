package main

import (
	"context"

	"github.com/unitypark/secure-cloudfront-http-api-cognito/customresource/internal/config"
	"github.com/unitypark/secure-cloudfront-http-api-cognito/customresource/internal/dynamodb"
	"github.com/unitypark/secure-cloudfront-http-api-cognito/customresource/internal/handler"
	"github.com/unitypark/secure-cloudfront-http-api-cognito/customresource/internal/logger"
	"github.com/unitypark/secure-cloudfront-http-api-cognito/customresource/internal/service"

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
