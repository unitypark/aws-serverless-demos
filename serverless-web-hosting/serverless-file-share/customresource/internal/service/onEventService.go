package service

import (
	"context"

	"github.com/aws/aws-lambda-go/cfn"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	cognitoidentityproviderService "github.com/deloittepark/serverless-file-share-customresource/internal/cognito"
	"github.com/deloittepark/serverless-file-share-customresource/internal/config"
	"go.uber.org/zap"
)

type (
	OnEventServiceIface interface {
		OnCreateEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error)
		OnUpdateEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error)
		OnDeleteEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error)
	}
	onEventService struct {
		config                         *config.Config
		cognitoidentityproviderService cognitoidentityproviderService.CognitoIdentityProviderServiceIface
	}
)

func NewOnEventService(
	config *config.Config,
	cognitoidentityproviderService cognitoidentityproviderService.CognitoIdentityProviderServiceIface,
) OnEventServiceIface {
	return &onEventService{
		config:                         config,
		cognitoidentityproviderService: cognitoidentityproviderService,
	}
}

func (crs *onEventService) OnCreateEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error) {
	err = crs.config.Init(event.ResourceProperties)
	if err != nil {
		zap.L().Error("unexpected error during config init", zap.Error(err))
		return
	}
	err = crs.initCognitoUser()
	if err != nil {
		zap.L().Error("unexpected error during cognito user init", zap.Error(err))
		return
	}
	return
}

func (crs *onEventService) OnUpdateEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error) {
	err = crs.config.Init(event.ResourceProperties)
	if err != nil {
		zap.L().Error("unexpected error during config init", zap.Error(err))
		return
	}
	err = crs.updateCognitoUserPassword()
	if err != nil {
		zap.L().Error("unexpected error during cognito user init", zap.Error(err))
		return
	}
	return
}

func (crs *onEventService) OnDeleteEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error) {
	err = crs.config.Init(event.ResourceProperties)
	if err != nil {
		zap.L().Error("unexpected error during config init", zap.Error(err))
		return
	}
	return
}

func (crs *onEventService) initCognitoUser() error {
	err := crs.cognitoidentityproviderService.CreateUser(&cognitoidentityprovider.AdminCreateUserInput{
		UserPoolId: &crs.config.UserPoolId,
		Username:   &crs.config.AdminUsername,
	})
	if err != nil {
		return err
	}

	return crs.cognitoidentityproviderService.SetUserPassword(&cognitoidentityprovider.AdminSetUserPasswordInput{
		UserPoolId: &crs.config.UserPoolId,
		Username:   &crs.config.AdminUsername,
		Password:   &crs.config.AdminPassword,
		Permanent:  true,
	})
}

func (crs *onEventService) updateCognitoUserPassword() error {
	return crs.cognitoidentityproviderService.SetUserPassword(&cognitoidentityprovider.AdminSetUserPasswordInput{
		UserPoolId: &crs.config.UserPoolId,
		Username:   &crs.config.AdminUsername,
		Password:   &crs.config.AdminPassword,
		Permanent:  true,
	})
}
