package handler

import (
	"github.com/aws/aws-lambda-go/events"
	cognitoidentityproviderService "github.com/unitypark/serverless-file-share/lambda/cognitotrigger/internal/service"
)

type (
	//go:generate go run github.com/maxbrunsfeld/counterfeiter/v6 -generate
	//counterfeiter:generate . cognitoTriggerServiceIface
	CognitoTriggerServiceIface interface {
		PostConfirmation(event events.CognitoEventUserPoolsPostConfirmation) (events.CognitoEventUserPoolsPostConfirmation, error)
		PostAuthentication(event events.CognitoEventUserPoolsPostAuthentication) (events.CognitoEventUserPoolsPostAuthentication, error)
	}
	cognitoTriggerService struct {
		cognitoidentityproviderService cognitoidentityproviderService.CognitoIdentityProviderServiceIface
	}
)

func NewCognitoTriggerService(
	cognitoidentityproviderService cognitoidentityproviderService.CognitoIdentityProviderServiceIface,
) CognitoTriggerServiceIface {
	return &cognitoTriggerService{
		cognitoidentityproviderService: cognitoidentityproviderService,
	}
}
