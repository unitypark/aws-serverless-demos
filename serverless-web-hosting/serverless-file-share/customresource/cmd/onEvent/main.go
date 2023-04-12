package main

import (
	"context"

	"github.com/aws/aws-lambda-go/cfn"
	"github.com/aws/aws-lambda-go/lambda"
	cognitoidentityprovider "github.com/deloittepark/serverless-file-share-customresource/internal/cognito"
	"github.com/deloittepark/serverless-file-share-customresource/internal/config"
	"github.com/deloittepark/serverless-file-share-customresource/internal/logger"
	"github.com/deloittepark/serverless-file-share-customresource/internal/register"
	"github.com/deloittepark/serverless-file-share-customresource/internal/service"
)

func init() {
	logger.Init()
}

func main() {
	var (
		onEventService = service.NewOnEventService(
			config.New(),
			cognitoidentityprovider.NewCognitoIdentityProviderService(context.Background()),
		)
		register = register.NewCustomResourceFunctionRegister(onEventService)
	)
	lambda.Start(cfn.LambdaWrap(register.ResolveEventRequest))
}
