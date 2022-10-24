# Using Cognito Sign Up Lambda Trigger

## 📖 Description
⚠️🚨 **Sign Up Lambda Trigger will be invoked by Amazon Cognito, only if the user does not exist in user pool yet. Otherwies Cognito will invoke Authtentication Lambda trigger, if it's configured.**

It is basically very similar trigger functions like Authentication Lambda Trigger. Only difference is that this trigger will be invoked, if user does not exist in the cognito userpool yet.

### ✅ Pre Sign Up Lambda Trigger
Shortly **before** Amazon Cognito signs up a new user, it activates the pre sign-up AWS Lambda function. As part of the sign-up process, you can use this function to perform custom validation and, based on the results of your validation, accept or deny the registration request.

💡 Usecase
- You can have this trigger, if you want to control the access of the user based on the user information, which cognito gets from OIDC Provider. For example, you can add custom validaion based on the attributes like **Role** or **email domain** to control access into your cloud application.

### ✅ Post Confirmation Lambda Trigger (Post Sign Up)
Amazon Cognito invokes this trigger **after** a new user is confirmed (added in userpool).

💡 Usecase
- You can have this trigger, if you want to extend your extra logic after adding user in userpool. For example, you can **modify** user attributes of current user, or you can send notification via SNS or you can publish event to Eventbridge to invoke your other microservice.


## 🚀 # Sample Functions
### ✅ Pre Sign Up
The following is a sample Lambda function that receives Amazon Cognito User Pools pre-signup event as an input and returns error, if UsernName matches with "baduser". So this user with username (baduser) is not allowed to sign up into your cognito userpool and gets an error.

```go
package main

import (
    "errors"

    "github.com/aws/aws-lambda-go/lambda"
    "github.com/aws/aws-lambda-go/events"
)

func handler(event events.CognitoEventUserPoolsPreSignup) (events.CognitoEventUserPoolsPreSignup, error) {
    if event.UserName == "baduser" {
        return events.CognitoEventUserPoolsPreSignup{}, errors.New("not allowed")
    }
    return event, nil
}

func main() {
  lambda.Start(handler)
}
```

### ✅ Post Confirmation (Post Sign Up)
The following is a sample Lambda function that receives Amazon Cognito User Pools post-confirmation event as an input and it modifies username attribute after signin. It is useful, when you want to save encrypted information into your userpool than provided information by OIDC Provider.

```go
package main

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

func handler(event events.CognitoEventUserPoolsPostConfirmation) (events.CognitoEventUserPoolsPostConfirmation, error) {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
        return events.CognitoEventUserPoolsPostConfirmation{}, err
	}
	client := cognitoidentityprovider.NewFromConfig(cfg)

	input := &cognitoidentityprovider.AdminUpdateUserAttributesInput{
		UserPoolId:     aws.String(event.UserPoolID),
		Username:       aws.String(event.UserName),
		ClientMetadata: event.Request.ClientMetadata,
		UserAttributes: []types.AttributeType{
			{
				Name:  aws.String("username"),
				Value: aws.String("new_user_name"),
			},
		},
	}

	res, err := client.AdminUpdateUserAttributes(context.Background(), input)
	if err != nil {
        return events.CognitoEventUserPoolsPostConfirmation{}, err
	}
	return event, nil
}

func main() {
	lambda.Start(handler)
}
```


## 👀 References
1. ☁️ [aws/documentation/pre-sign-up](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html)

2. ☁️ [aws/documentation/post-confirmation](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html)