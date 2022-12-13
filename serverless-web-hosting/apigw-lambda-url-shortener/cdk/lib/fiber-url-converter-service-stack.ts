import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as golambda from '@aws-cdk/aws-lambda-go-alpha'
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import { CachePolicy, Distribution, OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import path = require('path');

export class FiberUrlConverterServiceStack extends cdk.Stack {
  private readonly ddbTable: ddb.Table

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const API_LAMBDA_PREFIX = '../api/cmd'
    const LAMBDA_GET_URL_LOCATION = `${API_LAMBDA_PREFIX}/getUrl/main.go`
    const LAMBDA_POST_URL_LOCATION = `${API_LAMBDA_PREFIX}/postUrl/main.go`

    // create DynamoDB table
    this.ddbTable = new ddb.Table(this, 'CDKNotesTable', {
      tableName: 'url-mapping-table',
      billingMode: ddb.BillingMode.PROVISIONED,
      partitionKey: {
          name: 'ID',
          type: ddb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Creating entity index
    this.ddbTable.addGlobalSecondaryIndex({
      indexName: "Entities",
      partitionKey: { name: `Type`, type: ddb.AttributeType.STRING },
      sortKey: { name: `State`, type: ddb.AttributeType.STRING },
      projectionType: ddb.ProjectionType.ALL,
    });

    // api gateway
    const api = new apigateway.RestApi(this, 'url-converter-api', {
      description: "url-converter-rest-api",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
          "X-Amz-User-Agent",
          "Content-Encoding",
        ],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowCredentials: true,
      },
      // This will enable Content Encoding
      minimumCompressionSize: 0,
    });
    const urls = api.root.addResource('urls');
    const singleUrl = urls.addResource("{path}");

    // create lambda functions
    const postUrlHandler = this.createLambda('post-url', LAMBDA_POST_URL_LOCATION) 
    const getUrlHandler = this.createLambda('get-url', LAMBDA_GET_URL_LOCATION)

    // POST /urls
    urls.addMethod('POST',  new apigateway.LambdaIntegration(postUrlHandler));   

    // GET /urls/{path}
    singleUrl.addMethod('GET',  new apigateway.LambdaIntegration(getUrlHandler)); 

    /**
     * Cloudfront 
     */
    const frontendBucket = new s3.Bucket(this, "S3BucketForWebsite", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: true,
    });
    const cloudfrontOAI = new OriginAccessIdentity(this, "OAI", {
      comment: `OAI for url shortener app`,
    });
    frontendBucket.grantRead(cloudfrontOAI);

    // Create Cloudfront distribution with S3 as Origin
    const distribution = new Distribution(this, "distribution", {
      defaultBehavior: {
        origin: new S3Origin(frontendBucket, {
          originAccessIdentity: cloudfrontOAI,
        }),
        // Necessary to enable dynamic configuration injection
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",
    });

    new BucketDeployment(this, "deployStaticWebsite", {
      sources: [
        Source.asset(`${path.resolve(__dirname)}/../../ui/build`),
      ],
      destinationBucket: frontendBucket,
      // By default, files in the destination bucket that don't exist in the source will be deleted when the BucketDeployment resource is created or updated.
      // You can use the option prune: false to disable this behavior, in which case the files will not be deleted.
      prune: false,
      distribution: distribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
      exclude: ["runtime-config.json"],
    });

    const RUNTIME_CONFIG_FILE_NAME = "runtime-config.json";

    /** 
     * CUSTOM RESOURCE ONEVENT HANDLER
    */
    const onEventLambda = this.createLambda("onEvent", "../customresource/cmd/onEvent/main.go");
      frontendBucket.grantWrite(onEventLambda);
      // https://github.com/aws/aws-cdk/issues/11549#issuecomment-1308805103
      onEventLambda.addToRolePolicy(new iam.PolicyStatement({
        actions:['logs:CreateLogGroup'],
        resources:['*'],
        effect: iam.Effect.DENY
    }));
      
    new cdk.CustomResource(this, 'custom-resource', {
      resourceType: 'Custom::InjectReactRuntimeConfiguration',
      serviceToken: onEventLambda.functionArn,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      properties: {
        "runtimeConfigFileName": RUNTIME_CONFIG_FILE_NAME,
        "frontendBucketName": frontendBucket.bucketName,
        "apiGatewayUrl": api.url,
      },
    });

    new cdk.CfnOutput(this, 'CloudfrontDistributionDomain', { value: "http://" + distribution.distributionDomainName });
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
        environment: {
          URL_TABLE: this.ddbTable.tableName,
        },
    })
    new logs.LogGroup(this, `${name}-log-group`, {
        logGroupName: `/aws/lambda/${lambdaFn.functionName}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_DAY,
    })
    this.ddbTable.grantFullAccess(lambdaFn)
    return lambdaFn
  }
}
