package handler

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-lambda-go/events"
	fiberadapter "github.com/awslabs/aws-lambda-go-api-proxy/fiber"
	appResponse "github.com/unitypark/serverless-file-share/lambda/app/response"

	"go.uber.org/zap"
)

type FiberLambdaHandler interface {
	// You can define multiple lambda handlers invoked by other events like  CloudWatch, SQS etc.
	HandleAPIGatewayV2HTTPRequest(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error)
}

type fiberLambdaHandler struct {
	serviceName  *string
	fiberadapter *fiberadapter.FiberLambda
}

func NewApiHandler(serviceName string, h *fiberadapter.FiberLambda) FiberLambdaHandler {
	return &fiberLambdaHandler{
		serviceName:  &serviceName,
		fiberadapter: h,
	}
}

// Handler will deal with Fiber working with Lambda
func (h *fiberLambdaHandler) HandleAPIGatewayV2HTTPRequest(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	zap.L().Info(fmt.Sprintf("%s handler is invoked", *h.serviceName))
	zap.L().Info(fmt.Sprintf("incoming api request %v", req))

	var response events.APIGatewayV2HTTPResponse
	response, err := h.fiberadapter.ProxyWithContextV2(ctx, req)
	if err != nil {
		zap.L().Error("handler terminates with error", zap.Error(err))
	}

	appRes := new(appResponse.Response)
	err = json.Unmarshal([]byte(response.Body), appRes)
	if err != nil {
		zap.L().Error("handler terminates with error", zap.Error(err))
	}
	zap.L().Info("attaching user context to response")
	appRes.Data.User.Username = req.RequestContext.Authorizer.Lambda["username"].(string)
	appRes.Data.User.Role = req.RequestContext.Authorizer.Lambda["role"].(string)
	appRes.Data.User.IsAdmin = req.RequestContext.Authorizer.Lambda["isAdmin"].(bool)

	out, _ := json.Marshal(appRes)
	response.Body = string(out)
	zap.L().Info("user context is attached to response")

	zap.L().Info("handler terminates successfully", zap.Any("response", response))
	return response, err
}
