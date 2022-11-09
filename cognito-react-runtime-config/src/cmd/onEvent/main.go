package main

import (
	"context"

	"github.com/deloittepark/cognito-react-runtime-config/internal/config"
	"github.com/deloittepark/cognito-react-runtime-config/internal/logger"
	"github.com/deloittepark/cognito-react-runtime-config/internal/register"
	"github.com/deloittepark/cognito-react-runtime-config/internal/s3"
	"github.com/deloittepark/cognito-react-runtime-config/internal/service"

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
