import { Construct } from 'constructs';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { GoFunction } from '@aws-cdk/aws-lambda-go-alpha';
import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';

export interface LambdaProps {
    name: string;
    entry: string;
    vpc: Vpc;
    environmentVariables?: { [key: string]: string };
}

export default class LambdaConstruct extends Construct {
  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id);

    const functionName = props.name + '-handler'
    this.fn = new GoFunction(this, `${props.name}-handler`, {
        functionName,
        runtime: Runtime.PROVIDED_AL2,
        entry: props.entry,
        timeout: Duration.seconds(29),
        architecture: Architecture.ARM_64,
        memorySize: 128,
        tracing: Tracing.ACTIVE,
        vpc: props.vpc,
        environment: {
            ...props.environmentVariables,
        },
        bundling: {
            goBuildFlags: ['-ldflags "-s -w"'],
        },
    });
    this.fn.role?.addManagedPolicy(
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")
     );

    new LogGroup(this, `${props.name}-log-group`, {
        logGroupName: `/aws/lambda/${this.fn.functionName}`,
        removalPolicy: RemovalPolicy.DESTROY,
        retention: RetentionDays.ONE_DAY,
    });
  }

  public readonly fn: GoFunction
}
