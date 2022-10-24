# Using Cognito Pre Token Generator Lambda Trigger to add/override custom claims in ID Tokens

## 📖 Description
This Lambda trigger allows you to customize an identity token before it is generated. You can use this trigger to add new claims, update claims, or suppress claims in the identity token. In the below example, we will use Cognito Pre-token Generator Lambda Trigger to add a custom JWT claim called pet_preference to all incoming ID Token requests.

![](./images/cp1.png)

1. User is redirected to AWS Cognito User Pool to perform authentication (AuthN).
2. Lambda Pre Token Generator trigger is invoked.
3. Custom JWT claim pet_preference  is overriden in ID Token.
4. ID and Access Tokens are returned to the end-user for consumption.

## 🚀 Sample Function

The following is a sample Lambda function that receives Amazon Cognito User Pools pre-token-gen event as an input and adds pet_preference attribute in claims with other value.

```go
package main

import (
    "fmt"

    "github.com/aws/aws-lambda-go/lambda"
    "github.com/aws/aws-lambda-go/events"
)

func handler(event events.CognitoEventUserPoolsPreTokenGen) (events.CognitoEventUserPoolsPreTokenGen, error) {
  	overridingAttributes := make(map[string]string)
    overridingAttributes["pet_preference"] = "dog"
    event.Response.ClaimsOverrideDetails.ClaimsToAddOrOverride = overridingAttributes
    return event, nil
}

func main() {
  lambda.Start(handler)
}
```

Through the event.Response.ClaimsOverrideDetails.ClaimsToAddOrOverride key, we can add or override custom ID token claims to the JWT token in this case pet_preference. After adding or overriding values in claim object, you can just return the modified token back.

## 👀 References
1. ☁️ [aws/blogs/mobile](https://aws.amazon.com/blogs/mobile/how-to-use-cognito-pre-token-generators-to-customize-claims-in-id-tokens/)

2. ☁️ [aws/documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html)
