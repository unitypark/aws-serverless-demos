# CDK example to define lambda and cloudwatch log group

_Infrastructure as code framework used_: AWS CDK
_AWS Services used_: AWS Lambda, AWS Cloudwatch

## Summary of the demo

In this demo you will see:

- How to define your lambda function and cloudwatch log group properly with different removal policies and retention period.

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
cdk synth
cdk deploy
```

When asked about functions that may not have authorization defined, answer (y)es. The access to those functions will be open to anyone, so keep the app deployed only for the time you need this demo running.

To delete the app:

```
cdk destroy
```

## Links related to this code

- Video with more details: https://youtu.be/CeqwpYhlHbQ

### AWS CDK useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
