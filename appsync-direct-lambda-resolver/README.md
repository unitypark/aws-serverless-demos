# AppSync Direct Lambda resolver

This project contains a sample CDK template for using Direct Lambda resolvers using Go with an AppSync API. Direct Lambda resolvers allows you to write resolver logic in a language of your choice and circumvent the use of VTL.

In the given pattern, AWS AppSync will provide a arguments from context payload to your AWS Lambda function and a default of a Lambda function's response to a GraphQL type.

## Requirements

* [Create an AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html) if you do not already have one and log in. The IAM user that you use must have sufficient permissions to make necessary AWS service calls and manage AWS resources.
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) installed and configured
* [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed
* [Go](https://go.dev/doc/install) installed
* [Node and NPM](https://nodejs.org/en/download/) installed
* [AWS Cloud Development Kit](https://docs.aws.amazon.com/cdk/latest/guide/cli.html) (AWS CDK) installed

## Architecture
To each Query and Mutation of Graphql in AppSyncApi, one Lambda Resolver is attachted. It handles a business logic of the request.

It's defined as NoteService (Microservice) in Go. Each Lambda function has its own and single responsibility to interact with DynamoDB and it returns the reuslt back to AppSyncApi over ResultTemplateMapping. 

In this project, you can learn both cdk example and go microserivce structure. 

![](./docs/arch.jpg)


## Deploy

1. Clone the project to your local working directory
```
git clone https://github.com/deloittepark/aws-serverless-golang.git
```

2. Change the working directory to cdk's directory
```
cd appsync-direct-lambda-resolver/cdk
```

3. Install dependencies
```
npm install
```

4. This project uses typescript as client language for AWS CDK. Run the given command to compile typescript to javascript
```
npm run build
```

5. Synthesize CloudFormation template from the AWS CDK app
```
cdk synth
```

6. Deploy the stack to your default AWS account and region. The output of this command should give you the GraphQL URL and API Key for your AppSync API.
```
cdk deploy
```
## Test

You can test your AppSync API and Direct Lambda resolver by running a query from AWS AppSync console.

![](./docs/test_mutation.jpg)

You can run a query directly from your terminal or via postman:

```
# install curl. https://curl.se/
# optional: install jq. https://stedolan.github.io/jq/
# replace <graphqlUrl> and <apiKey> with the outputs values from `cdk deploy`
curl --location --request POST '<graphqlUrl>' \
--header 'x-api-key: <apiKey>' \
--header 'Content-Type: application/json' \
--data-raw '{"query":"query { listNotes }","variables":{}}' | jq
```

## Cleanup

Run the given command to delete the resources that were created. It might take some time for the CloudFormation stack to get deleted. This will delete all deployed resources including cloudwatch lamdba log groups.
```
cdk destroy
```

## References

1. https://aws.amazon.com/blogs/mobile/appsync-direct-lambda/

2. https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-lambda.html#direct-lambda-resolvers

3. https://aws.amazon.com/blogs/mobile/building-scalable-graphql-apis-on-aws-with-cdk-and-aws-appsync/
