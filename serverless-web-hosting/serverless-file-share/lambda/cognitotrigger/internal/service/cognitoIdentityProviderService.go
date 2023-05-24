package service

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"go.uber.org/zap"
)

var cognitoidentityproviderClient *cognitoidentityprovider.Client

type (
	CognitoIdentityProviderServiceIface interface {
		AdminUpdateUserAttributes(input *cognitoidentityprovider.AdminUpdateUserAttributesInput) error
	}
	cognitoIdentityProviderService struct {
		ctx                           context.Context
		cognitoidentityproviderClient *cognitoidentityprovider.Client
	}
)

func NewCognitoIdentityProviderService(ctx context.Context) CognitoIdentityProviderServiceIface {
	client, err := newClient(ctx)
	if err != nil {
		zap.L().Panic("unexpected error during initializing cognitoidentityprovider client", zap.Error(err))
	}
	return &cognitoIdentityProviderService{
		ctx:                           ctx,
		cognitoidentityproviderClient: client,
	}
}

func newClient(ctx context.Context) (*cognitoidentityprovider.Client, error) {
	if cognitoidentityproviderClient == nil {
		zap.L().Info("creating instance of cognitoidentityprovider client.")
		cfg, err := config.LoadDefaultConfig(ctx)
		if err != nil {
			panic("configuration error, " + err.Error())
		}
		cognitoidentityproviderClient = cognitoidentityprovider.NewFromConfig(cfg)
	} else {
		zap.L().Info("cognitoidentityprovider client is already created.")
	}
	return cognitoidentityproviderClient, nil
}
