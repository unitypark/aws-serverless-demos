package main

import (
	"context"

	"github.com/deloittepark/apigw-lambda-url-shortener-customresource/internal/config"
	"github.com/deloittepark/apigw-lambda-url-shortener-customresource/internal/logger"
	"github.com/deloittepark/apigw-lambda-url-shortener-customresource/internal/register"
	"github.com/deloittepark/apigw-lambda-url-shortener-customresource/internal/s3"
	"github.com/deloittepark/apigw-lambda-url-shortener-customresource/internal/service"

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
			s3.NewS3Service(context.Background()),
		)
		register = register.NewCustomResourceFunctionRegister(onEventService)
	)
	lambda.Start(cfn.LambdaWrap(register.ResolveEventRequest))
}
