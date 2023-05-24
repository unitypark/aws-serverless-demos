package handler

import (
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
	"go.uber.org/zap"
)

func (cts *cognitoTriggerService) PostAuthentication(event events.CognitoEventUserPoolsPostAuthentication) (events.CognitoEventUserPoolsPostAuthentication, error) {
	updateAttributesInput := &cognitoidentityprovider.AdminUpdateUserAttributesInput{
		UserPoolId:     aws.String(event.UserPoolID),
		Username:       aws.String(event.UserName),
		ClientMetadata: event.Request.ClientMetadata,
		UserAttributes: []types.AttributeType{
			{
				Name:  aws.String("custom:isAdmin"),
				Value: aws.String("false"),
			},
		},
	}
	err := cts.cognitoidentityproviderService.AdminUpdateUserAttributes(updateAttributesInput)
	if err != nil {
		zap.L().Error("unexpected error during AdminUpdateUserAttributes", zap.Error(err))
		return events.CognitoEventUserPoolsPostAuthentication{}, err
	}
	return event, nil
}
