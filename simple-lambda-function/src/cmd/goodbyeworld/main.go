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
	Age  int    `json:"age"`
}

type MyResponse struct {
	Message string `json:"message"`
}

func HandleLambdaEvent(ctx context.Context, event MyEvent) (MyResponse, error) {
	res := MyResponse{Message: fmt.Sprintf("%s is %d years old!", event.Name, event.Age)}
	zap.L().Debug("MyResponse", zap.Any("result", res))
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
		HandleLambdaEvent(context.Background(), MyEvent{Name: "localtest", Age: 3})
	} else {
		// otherwise handler will be invoked by AWS Lambda
		lambda.Start(HandleLambdaEvent)
	}
}
