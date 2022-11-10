import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { CfnOutput, CustomResource, CustomResourceProvider, Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment";
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { GoFunction } from "@aws-cdk/aws-lambda-go-alpha";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from 'aws-cdk-lib/aws-logs'
import * as iam from "aws-cdk-lib/aws-iam";
import * as customResources from 'aws-cdk-lib/custom-resources';
import path from "path";

export class CognitoReactRuntimeConfigStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const RUNTIME_CONFIG_FILE_NAME = "runtime-config.json";

    /** 
     * COGNITO
    */
    const userPool = new cognito.UserPool(this, 'test-user-pool', {
      userPoolName: "test-user-pool",
      autoVerify: { email: true }, // Verify email addresses by sending a verification code
      signInAliases: { email: true }, // Set email as an alias
      selfSignUpEnabled: true, // Allow users to sign up
      customAttributes: {
        'company': new cognito.StringAttribute({ minLen: 1, maxLen: 100, mutable: true }),
      },
      removalPolicy: RemovalPolicy.DESTROY,
    })
    const appClient = userPool.addClient('test-app-client')

    /** 
     * FRONTEND S3 BUCKET
    */
    const frontendBucket = new s3.Bucket(this, "S3BucketForWebsite", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: true,
    });

    /** 
     * CLOUDFRONT
    */
    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, "OAI", {
      comment: `OAI for react application`,
    });
    frontendBucket.grantRead(cloudfrontOAI);

    const distribution = new cloudfront.Distribution(this, "distribution", {
      defaultBehavior: {
        origin: new S3Origin(frontendBucket, {
          originAccessIdentity: cloudfrontOAI,
        }),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",
    });

    /** 
     * S3 BUCKET DEPLOYMENT
    */
    new s3Deployment.BucketDeployment(this, "deployStaticWebsite", {
      sources: [
        s3Deployment.Source.asset(`${path.resolve(__dirname)}/../../react/build`),
      ],
      destinationBucket: frontendBucket,
      prune: false,
      distribution: distribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
      exclude: ['runtime-config.json'],
    });

    /** 
     * CUSTOM RESOURCE ONEVENT HANDLER
    */
    const onEventLambda = this.createLambda("onEvent", "../src/cmd/onEvent/main.go");
    frontendBucket.grantWrite(onEventLambda);
    // https://github.com/aws/aws-cdk/issues/11549#issuecomment-1308805103
    onEventLambda.addToRolePolicy(new iam.PolicyStatement({
      actions:['logs:CreateLogGroup'],
      resources:['*'],
      effect: iam.Effect.DENY
    }));
    
    new CustomResource(this, 'custom-resource', {
      resourceType: 'Custom::InjectReactRuntimeConfiguration',
      serviceToken: onEventLambda.functionArn,
      removalPolicy: RemovalPolicy.DESTROY,
      properties: {
        "runtimeConfigFileName": RUNTIME_CONFIG_FILE_NAME,
        "frontendBucketName": frontendBucket.bucketName,
        "userpoolId": userPool.userPoolId,
        "appClientId": appClient.userPoolClientId,
      },
    });

    /** 
     * OUTPUTS
    */
    new CfnOutput(this, 'runtimeConfigFileName', { value: RUNTIME_CONFIG_FILE_NAME })
    new CfnOutput(this, 'frontendBucketName', { value: frontendBucket.bucketName })
    new CfnOutput(this, 'userPoolId', { value: userPool.userPoolId })
    new CfnOutput(this, 'appClientId', { value: appClient.userPoolClientId })
    new CfnOutput(this, 'distributionDomain', { value: distribution.distributionDomainName })
  }

  /** 
   * CREATE GO LAMBDA FUNCTION
  */
  createLambda(name: string, entry: string): GoFunction {
    const functionName = name + '-handler'
    const lambdaFn = new GoFunction(this, functionName, {
        functionName: functionName,
        entry: entry,
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.PROVIDED_AL2,
        timeout: Duration.seconds(29),
        memorySize: 256,
        tracing: lambda.Tracing.ACTIVE,
    })
    // Explicit log group that refers to the Lambda function
    new logs.LogGroup(this, `${name}-log-group`, {
      logGroupName: `/aws/lambda/${lambdaFn.functionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_DAY,
    })
    return lambdaFn
  }
}
