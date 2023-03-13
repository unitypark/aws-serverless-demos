# CDK example to define lambda and cloudwatch log group

_Infrastructure as code framework used_: AWS CDK
_AWS Services used_: AWS Lambda, AWS Cloudwatch

## Summary of the demo

In this demo you will see:

- log group created by cloudformation custom resource, once the lambda is invoked.

- log group with different retention period created by cloudformation custom resource

- log group created explicitly as part of the stack resource. 

## Goal
**Retaining LogGroup and reusing it when redeploy the Lambda**

How to define your lambda function and cloudwatch log group properly with different removal policies and retention period, so that you could keep certain log groups after redeploy and do not have any error because of existing resources during deployment of the stack.

https://stackoverflow.com/questions/67210534/retaining-loggroup-and-reusing-it-when-redeploy-the-lambda


## Requirements

- AWS CLI already configured with Administrator permission
- AWS CDK - v2
- NodeJS 14.x installed
- CDK bootstrapped in your account

```
npx aws-cdk bootstrap --toolkit-stack-name 'CDKToolkit-Lambda-Cloudwatch-Demo' --qualifier 'demo' --cloudformation-execution-policies 'arn:aws:iam::aws:policy/AdministratorAccess' aws://<YOUR_AWS_ACCOUNT_ID>/<REGION> 
```

## Deploy this demo

Deploy the project to the cloud:

```
npm install && cdk deploy
```

To delete the app:

```
cdk destroy
```

## Summary

- By default, cloudformation custom resource creates a log group for lambda with **removalPolicy = RETAIN and logRetetion = INFINITE**.

- If you want to change its default behaviour, you have to create explicitly a log group for your lambda, which will overwrite the default setting. Its name must be defined in same manner, e.g. **/aws/lambda/{functionName}**

- If you, however, have any edge cases, that your stack should be re-deployed, then explicitly created log group's removalPolicy  must be set to DESTROY before. Otherwise, when you redeploy your stack after deletion, stack creation will throw an error, because log group with same name exists already in your account because of RETAIN policy.

- If you want to redeploy your stacks and keep your cloudwatch logs after redeploy, do not define your cloudwatch log group explicitly. Let custom resource handle this case. It will only create a new log group, if there's no log group exists in your account.

## Reference
1. [CDK V2 aws-logs](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs-readme.html)
2. [Accessing Amazon CloudWatch logs for AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html)