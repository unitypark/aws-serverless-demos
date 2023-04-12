import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs'
import * as golambda from '@aws-cdk/aws-lambda-go-alpha'
import { Construct } from 'constructs';

export interface GoLambdaFunctionProps {
    name: string;
    entry: string;
    environmentVariables: { [key: string]: string };
}

export class GoLambdaFunction extends Construct {
    public readonly fn: golambda.GoFunction
    
    constructor(scope: Construct, id: string, props: GoLambdaFunctionProps) {
    super(scope, id);

    const functionName = props.name + '-handler'
    this.fn = new golambda.GoFunction(this, `${props.name}-handler`, {
        functionName,
        runtime: lambda.Runtime.PROVIDED_AL2,
        entry: props.entry,
        timeout: cdk.Duration.seconds(29),
        architecture: lambda.Architecture.ARM_64,
        memorySize: 256,
        tracing: lambda.Tracing.ACTIVE,
        environment: {
            ...props.environmentVariables,
        },
        bundling: {
            goBuildFlags: ['-ldflags "-s -w"'],
        },
    });
    new logs.LogGroup(this, `${props.name}-log-group`, {
        logGroupName: `/aws/lambda/${this.fn.functionName}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_DAY,
    });
  }
}
