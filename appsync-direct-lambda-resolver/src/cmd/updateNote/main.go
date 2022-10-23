package main

import (
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/config"
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/dao"
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/logger"
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/service"

	"github.com/aws/aws-lambda-go/lambda"
)

var noteService service.NoteServiceIface

func init() {
	if noteService == nil {
		logger.Init()
		noteService = service.New(config.New(), dao.New())
	}
}

func main() {
	lambda.Start(noteService.UpdateNote)
}
