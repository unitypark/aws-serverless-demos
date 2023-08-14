package main

import (
	"context"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/unitypark/oatuh2-cognito-best-practice/lambda/cognitotrigger/internal/handler"
	"github.com/unitypark/oatuh2-cognito-best-practice/lambda/cognitotrigger/internal/logger"
	"github.com/unitypark/oatuh2-cognito-best-practice/lambda/cognitotrigger/internal/service"
	"go.uber.org/zap"
)

func init() {
	logger.Init()
	zap.L().Info("lambda cold start")
}

func main() {
	var (
		cognitoTriggerService = handler.NewCognitoTriggerService(
			service.NewCognitoIdentityProviderService(context.Background()),
		)
	)
	lambda.Start(cognitoTriggerService.PostAuthentication)
}
