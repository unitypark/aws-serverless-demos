import { Construct } from 'constructs';
import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from "aws-cdk-lib/aws-logs";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import * as path from 'path';

type CloudwatchConfig = {
  explicitLogGroup: boolean,
  logRetention?: logs.RetentionDays,
  removalPolicy?: RemovalPolicy,
}

export class LambdaCloudwatchStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // default log group created by cloudformation custom resource
    // creation time: log group will be created automatically, once the lambda is invoked.
    this.createLambda(
      'lambda-log-group-default', 
      `/../lambda/hello_function.ts`, 
      {
        explicitLogGroup: false,
        logRetention: undefined,
        removalPolicy: undefined,
      }
    )

    // default log group created by cloudformation custom resource, but with specific retention period
    // creation time: log group will be created, after stack is deployed
    this.createLambda(
      'lambda-log-group-retain', 
      `/../lambda/hello_function.ts`, 
      {
        explicitLogGroup: false,
        logRetention: logs.RetentionDays.THREE_MONTHS,
        removalPolicy: undefined,
      }
    )
  
    // log group created explicitly as a resource of the stack
    // creation time: log group will be created, after stack is deployed
    // it should be destroyed with stack together, in order to be able to redeploy stack in the future
    this.createLambda(
      'lambda-log-group-destroy', 
      `/../lambda/hello_function.ts`, 
      {
        explicitLogGroup: true,
        logRetention: logs.RetentionDays.ONE_DAY,
        removalPolicy: RemovalPolicy.DESTROY,
      }
    )
  }

  createLambda(
    name: string,
    loc: string,
    cloudwatchConfig: CloudwatchConfig
    ) : lambda.Function {
    const lfn = new NodejsFunction(this, name + '-function', {
      runtime: lambda.Runtime.NODEJS_14_X,
      functionName: name + '-handler',
      memorySize: 256,
      logRetention: cloudwatchConfig.logRetention,
      timeout: Duration.seconds(5),
      handler: 'handler',
      entry: path.join(__dirname, loc),
    });

    if (cloudwatchConfig.explicitLogGroup) {
      // Explicit log group that refers to the Lambda function
      new logs.LogGroup(this, `${name}-log-group`, {
        logGroupName: `/aws/lambda/${lfn.functionName}`,
        removalPolicy: cloudwatchConfig.removalPolicy,
      });
    }
    return lfn
  }
}
