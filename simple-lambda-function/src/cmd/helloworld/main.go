package main

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/lambda"
	"go.uber.org/zap"

	appConfig "github.com/deloittepark/simple-lambda-function/internal/config"
	zapLogger "github.com/deloittepark/simple-lambda-function/internal/logger"
)

var config *appConfig.Config

type MyEvent struct {
	Name string `json:"name"`
}

func HandleRequest(ctx context.Context, event MyEvent) (string, error) {
	res := fmt.Sprintf("Hello %s!", event.Name)
	zap.L().Debug("HandleRequest", zap.Any("result", res))
	return res, nil
}

func init() {
	config = appConfig.New()
	zapLogger.Init(config.Env)
	zap.L().Info("lambda cold start")
}

func main() {
	if config.Env == appConfig.Local {
		zap.L().Debug("local environment is selected.")
		// in local environment, you can invoke your handler with your own context and event payload
		HandleRequest(context.Background(), MyEvent{Name: "localtest"})
	} else {
		// otherwise handler will be invoked by AWS Lambda
		lambda.Start(HandleRequest)
	}
}
