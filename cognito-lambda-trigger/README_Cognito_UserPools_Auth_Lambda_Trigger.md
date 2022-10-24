# Using Cognito Authentication Lambda Trigger

## 📖 Description
⚠️🚨 **Authentication Lambda Trigger will be invoked by Amazon Cognito, only if the authenticating user is already signed up in user pool.**

It is basically very similar trigger functions like Sign Up Lambda Trigger. Only difference is that this trigger will be invoked, if user does exist in the cognito user pool already.

### ✅ Pre Authentication Lambda Trigger
Amazon Cognito invokes this trigger **before** signing in a user, you can create custom validation that accepts or denies the authentication request.

💡 Usecase
- You can have this trigger, if you want to control the access of the user based on the user information, which cognito gets from OIDC Provider. For example, you can add custom validaion based on the attributes like **Role** or **email domain** to control access into your cloud application.

### ✅ Post Authentication Lambda Trigger
Amazon Cognito invokes this trigger **after** signing in a user, you can add custom logic after Amazon Cognito authenticates the user.

💡 Usecase
- You can have this trigger, if you want to extend your extra logic after signing user. For example, you can **modify** user attributes of current user, or you can send Email via SNS or even you can fire event to Eventbridge to invoke your other microservice.


## 🚀 # Sample Functions
### ✅ Pre Authentication
The following is a sample Lambda function that receives Amazon Cognito User Pools pre-authentication event as an input and returns error, if UsernName matches with "baduser".

```go
package main

import (
    "errors"

    "github.com/aws/aws-lambda-go/lambda"
    "github.com/aws/aws-lambda-go/events"
)

func handler(event events.CognitoEventUserPoolsPreAuthentication) (events.CognitoEventUserPoolsPreAuthentication, error) {
    if event.UserName == "baduser" {
        return events.CognitoEventUserPoolsPreAuthentication{}, errors.New("not allowed")
    }
    return event, nil
}

func main() {
  lambda.Start(handler)
}
```

### ✅ Post Authentication
The following is a sample Lambda function that receives Amazon Cognito User Pools post-authentication event as an input and it modifies username attribute after signin.

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

func handler(event events.CognitoEventUserPoolsPostAuthentication) (events.CognitoEventUserPoolsPostAuthentication, error) {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
        return events.CognitoEventUserPoolsPostAuthentication{}, err
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
        return events.CognitoEventUserPoolsPostAuthentication{}, err
	}
	return event, nil
}

func main() {
	lambda.Start(handler)
}
```


## 👀 References
1. ☁️ [aws/documentation/pre-authentication](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-authentication.html)

2. ☁️ [aws/documentation/post-authentication](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html)