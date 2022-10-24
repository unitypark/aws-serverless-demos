# simple-lambda-function
This project demonstrates the way to invoke your lambda handler locally. Locally means that you can just start your function like well-known default **"Hello World!** Application in all languages. It does not require any docker container or other virtual maschine to test your handler logic. 

## ✅ Requirements 
* [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed
* [Go](https://go.dev/doc/install) installed
* [Node and NPM](https://nodejs.org/en/download/) installed

## 🙄 Optoinal 
Since this project can be tested complete locally, AWS is optional in this case. But I recommend to deploy and compare the results on your own.
* [AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html)
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) installed

## 💡 Key idea
Your handler function will be invoked by AWS Lambda virtually, when it's deployed in AWS. But basically developer can run through the handler logic for testing, without testing directly in AWS. 

🔥 All you need to do is to set configuration (local or production) and your main function in your code. Depending on the **environment** you provide, you can make your applicatoin be invoked by **you** or by **AWS Lamdba**.

In Production, for example, your fucntion will be invoked by AWS Lambda virtually, but in local environment, you could invoke your handler with your own event payload and context.

## ⭐ Valid handler signatures in Go
``` 
func ()
func () error
func (TIn) error
func () (TOut, error)
func (context.Context) error
func (context.Context, TIn) error
func (context.Context) (TOut, error)
func (context.Context, TIn) (TOut, error)

```
https://docs.aws.amazon.com/lambda/latest/dg/golang-handler.html

## 🔥 Deploy
If you want to compare the results, you could deploy a given stack into your AWS Account.

1. Clone the project to your local working directory
```
git clone https://github.com/deloittepark/aws-serverless-golang.git
```

2. Change the working directory to cdk's directory
```
cd simple-lambda-function/cdk
```

3. Install dependencies
```
npm install
```

4. This project uses typescript as client language for AWS CDK. Run the given command to compile typescript to javascript
```
npm run build
```

5. Bootstrap your account with following command
```
npx aws-cdk bootstrap --toolkit-stack-name 'CDKToolkit-Local-Lambda' --qualifier 'hero' --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' aws://<YOUR_AWS_ACCOUNT_ID>/<REGION> 
```

6. Synthesize CloudFormation template from the AWS CDK app
```
cdk synth
```

6. Deploy the stack to your default AWS account and region. The output of this command should give you the URL of the ApiGateway, which you can invoke via terminal or Postman
```
cdk deploy
```
## 🚀 Local Test

You can run this handlers without deploying into AWS Environment complete locally.

1. Go to directory **src/cmd/goodbyeworld** or **src/cmd/goodbyeworld**

2. Start your handler locally
```
env=local go run main.go
```

3. Enjoy your debugging information in terminal and you can build more complex business logic 🔥

## 🔨 Cleanup

Run the given command to delete the resources that were created. It might take some time for the CloudFormation stack to get deleted. This will delete all deployed resources including cloudwatch lamdba log groups. 🌳🌎🌈
```
cdk destroy
```

## 👀 References

1. ☁️ [AWS Lambda function handler in Go
](https://docs.aws.amazon.com/lambda/latest/dg/golang-handler.html)

