package cognito

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"go.uber.org/zap"
)

var cognitoidentityproviderClient *cognitoidentityprovider.Client

type (
	//go:generate go run github.com/maxbrunsfeld/counterfeiter/v6 -generate
	//counterfeiter:generate . CognitoIdentityProviderServiceIface
	CognitoIdentityProviderServiceIface interface {
		CreateUser(input *cognitoidentityprovider.AdminCreateUserInput) error
		SetUserPassword(input *cognitoidentityprovider.AdminSetUserPasswordInput) error
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

func (cips *cognitoIdentityProviderService) CreateUser(input *cognitoidentityprovider.AdminCreateUserInput) error {
	_, err := cips.cognitoidentityproviderClient.AdminCreateUser(cips.ctx, input)
	if err != nil {
		return err
	}
	return nil
}

func (cips *cognitoIdentityProviderService) SetUserPassword(input *cognitoidentityprovider.AdminSetUserPasswordInput) error {
	_, err := cips.cognitoidentityproviderClient.AdminSetUserPassword(cips.ctx, input)
	if err != nil {
		return err
	}
	return nil
}
