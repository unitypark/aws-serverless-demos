package handler

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
	"go.uber.org/zap"
)

type FiberLambdaHandler interface {
	// You can define multiple lambda handlers invoked by other events like  CloudWatch, SQS etc.
	HandleAPIGatewayProxyRequest(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error)
}

type fiberLambdaHandler struct {
	serviceName  *string
	fiberadapter *fiberadapter.FiberLambda
}

func NewHandler(serviceName string, h *fiberadapter.FiberLambda) FiberLambdaHandler {
	return &fiberLambdaHandler{
		serviceName:  &serviceName,
		fiberadapter: h,
	}
}

// Handler will deal with Fiber working with Lambda
func (h *fiberLambdaHandler) HandleAPIGatewayProxyRequest(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	zap.L().Info(fmt.Sprintf("%s handler is invoked", *h.serviceName))
	// If no name is provided in the HTTP request body, throw an error
	var response events.APIGatewayV2HTTPResponse

	// Extra Busnisess logic like mapping of RequestContext goes here, before calling ProxyWithContext Method
	response, err := h.fiberadapter.ProxyWithContextV2(ctx, req)
	if err != nil {
		zap.L().Error("handler terminates with error", zap.Error(err))
	}
	zap.L().Info("handler terminates successfully", zap.Any("response", response))
	return response, err
}
