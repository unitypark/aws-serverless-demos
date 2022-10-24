import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs'
import * as golambda from '@aws-cdk/aws-lambda-go-alpha'
import { Construct } from 'constructs';

export class CdkStack extends cdk.Stack { 
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const LAMBDA_PREFIX = '../src/cmd'
    const HELLOWORLD_LAMBDA_URL_LOCATION = `${LAMBDA_PREFIX}/helloworld/main.go`
    const GOODBYEWORLD_LAMBDA_URL_LOCATION = `${LAMBDA_PREFIX}/goodbyeworld/main.go`

    this.createLambda('helloworld', HELLOWORLD_LAMBDA_URL_LOCATION) 
    this.createLambda('goodbye', GOODBYEWORLD_LAMBDA_URL_LOCATION) 
  }
  createLambda(name: string, entry: string): golambda.GoFunction {
    const functionName = name + '-handler'
    const lambdaFn = new golambda.GoFunction(this, `${name}-handler`, {
        functionName,
        runtime: lambda.Runtime.PROVIDED_AL2,
        entry: entry,
        timeout: cdk.Duration.seconds(29),
        architecture: lambda.Architecture.ARM_64,
        memorySize: 256,
        tracing: lambda.Tracing.ACTIVE,
    })
    new logs.LogGroup(this, `${name}-log-group`, {
        logGroupName: `/aws/lambda/${lambdaFn.functionName}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_DAY,
    })
    return lambdaFn
  }
}
