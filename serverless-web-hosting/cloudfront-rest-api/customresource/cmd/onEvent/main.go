package main

import (
	"context"

	"github.com/unitypark/cloudfront-rest-api-customresource/internal/config"
	"github.com/unitypark/cloudfront-rest-api-customresource/internal/logger"
	"github.com/unitypark/cloudfront-rest-api-customresource/internal/register"
	"github.com/unitypark/cloudfront-rest-api-customresource/internal/s3"
	"github.com/unitypark/cloudfront-rest-api-customresource/internal/service"

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
