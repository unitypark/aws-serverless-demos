import { Construct } from 'constructs';
import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from "aws-cdk-lib/aws-logs";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs"
import * as path from 'path';

type CloudwatchConfig = {
  explicitLogGroup: boolean,
  logRetention: logs.RetentionDays,
  removalPolicy: RemovalPolicy,
}

export class LambdaCloudwatchStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // log group should be remained
    this.createLambda(
      'retain-log-group-lambda', 
      `/../lambda/hello_function.ts`, 
      {
        explicitLogGroup: false,
        logRetention: logs.RetentionDays.THREE_MONTHS,
        removalPolicy: RemovalPolicy.RETAIN,
      }
    )
  
    // log group should be destroyed
    this.createLambda(
      'destroy-log-group-lambda', 
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
