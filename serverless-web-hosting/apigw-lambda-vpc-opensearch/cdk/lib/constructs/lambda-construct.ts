import { Construct } from 'constructs';
import { Port, Vpc } from 'aws-cdk-lib/aws-ec2';
import { GoFunction } from '@aws-cdk/aws-lambda-go-alpha';
import { Architecture, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Domain } from 'aws-cdk-lib/aws-opensearchservice';

export interface LambdaProps {
    name: string;
    entry: string;
    vpc: Vpc;
    masterUsername: string;
    masterUserPassword: string;
    osDomain: Domain;
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
            OPENSEARCH_ENDPOINT: `https://${props.osDomain.domainEndpoint}`,
            OPENSEARCH_MASTER_USERNAME: props.masterUsername,
            OPENSEARCH_MASTER_USER_PASSWORD: props.masterUserPassword,
        },
        bundling: {
            goBuildFlags: ['-ldflags "-s -w"'],
        },
    });
    this.fn.role?.addManagedPolicy(
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")
     );

    // allows this lambda function to connect to opensearch over https protocol
    props.osDomain.connections.allowFrom(this.fn, Port.tcp(443));

    new LogGroup(this, `${props.name}-log-group`, {
        logGroupName: `/aws/lambda/${this.fn.functionName}`,
        removalPolicy: RemovalPolicy.DESTROY,
        retention: RetentionDays.ONE_DAY,
    });
  }

  public readonly fn: GoFunction
}
