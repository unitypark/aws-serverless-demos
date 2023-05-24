package service

import (
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
)

func (cips *cognitoIdentityProviderService) AdminUpdateUserAttributes(input *cognitoidentityprovider.AdminUpdateUserAttributesInput) error {
	_, err := cips.cognitoidentityproviderClient.AdminUpdateUserAttributes(cips.ctx, input)
	if err != nil {
		return err
	}
	return nil
}
