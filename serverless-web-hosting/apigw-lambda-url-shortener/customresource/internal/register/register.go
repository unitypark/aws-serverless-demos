package register

import (
	"context"
	"fmt"

	"github.com/aws/aws-lambda-go/cfn"
	"github.com/deloittepark/apigw-lambda-url-shortener-customresource/internal/service"
)

type (
	CustomResourceFunctionRegisterIface interface {
		ResolveEventRequest(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error)
	}
	customResourceFunctionRegister struct {
		onEventService service.OnEventServiceIface
	}
)

func NewCustomResourceFunctionRegister(
	customResourceService service.OnEventServiceIface,
) CustomResourceFunctionRegisterIface {
	return &customResourceFunctionRegister{
		onEventService: customResourceService,
	}
}

func (rgstr *customResourceFunctionRegister) ResolveEventRequest(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error) {
	if event.ResourceType != "Custom::InjectReactRuntimeConfiguration" {
		err = fmt.Errorf("unknown resource type %s", event.ResourceType)
		return
	}
	switch event.RequestType {
	case "Create":
		return rgstr.onEventService.OnCreateEvent(ctx, event)
	case "Update":
		return rgstr.onEventService.OnUpdateEvent(ctx, event)
	case "Delete":
		return rgstr.onEventService.OnDeleteEvent(ctx, event)
	default:
		err = fmt.Errorf("unsupported request type: %s", event.RequestType)
	}
	return
}
