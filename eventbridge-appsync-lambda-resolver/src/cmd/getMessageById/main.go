package main

import (
	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/config"
	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/dao"
	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/logger"
	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/service"

	"github.com/aws/aws-lambda-go/lambda"
)

var messageService service.MessageServiceIface

func init() {
	if messageService == nil {
		logger.Init()
		messageService = service.New(config.New(), dao.New())
	}
}

func main() {
	lambda.Start(messageService.GetMessageById)
}
