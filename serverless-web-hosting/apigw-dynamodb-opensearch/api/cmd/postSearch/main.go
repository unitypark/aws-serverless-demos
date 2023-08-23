package main

import (
	"context"
	"encoding/json"
	"fmt"
	"runtime"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func Handler(_ context.Context, r events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	data, _ := json.Marshal(map[string]interface{}{
		"message": fmt.Sprintf("Hello World from Lambda with %s", runtime.Version()),
		"event":   r,
	})
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Body:       string(data),
	}, nil
}

func main() {
	lambda.Start(Handler)
}
