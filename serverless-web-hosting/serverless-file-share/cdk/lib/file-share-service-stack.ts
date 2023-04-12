import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as golambda from '@aws-cdk/aws-lambda-go-alpha'
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import { CachePolicy, Distribution, ErrorResponse, OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import path = require('path');

export class FileShareServiceStack extends cdk.Stack {
  private readonly ddbTable: ddb.Table
  private readonly fileShareBucket: s3.Bucket

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const API_LAMBDA_PREFIX = '../api/cmd'
    const LAMBDA_POST_UPLOADS_LOCATION = `${API_LAMBDA_PREFIX}/postUploads/main.go`
    const LAMBDA_GET_UPLOAD_LOCATION = `${API_LAMBDA_PREFIX}/getUpload/main.go`
    const LAMBDA_POST_DOWNLOADS_LOCATION = `${API_LAMBDA_PREFIX}/postDownloads/main.go`
    const LAMBDA_GET_DOWNLOAD_LOCATION = `${API_LAMBDA_PREFIX}/getDownload/main.go`

    // create DynamoDB table
    this.ddbTable = new ddb.Table(this, 'file-share-table', {
      tableName: 'file-share-table',
      billingMode: ddb.BillingMode.PROVISIONED,
      partitionKey: {
          name: 'PK',
          type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: ddb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // api gateway
    const api = new apigateway.RestApi(this, 'file-share-rest-api', {
      description: "file-share-rest-api",
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
    const uploads = api.root.addResource('uploads');
    const upload = uploads.addResource("{key}");

    const downloads = api.root.addResource('downloads');
    const download = downloads.addResource("{key}");

    /**
     * Cloudfront 
     */
    const frontendBucket = new s3.Bucket(this, "WebsiteBucket", {
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

    const errorResponse403: ErrorResponse = {
      httpStatus: 403,
      // the properties below are optional
      responseHttpStatus: 200,
      responsePagePath: '/index.html',
      ttl: cdk.Duration.seconds(10),
    };

    const errorResponse404: ErrorResponse = {
      httpStatus: 404,
      // the properties below are optional
      responseHttpStatus: 200,
      responsePagePath: '/index.html',
      ttl: cdk.Duration.seconds(10),
    };

    // Create Cloudfront distribution with S3 as Origin
    const distribution = new Distribution(this, "distribution", {
      defaultBehavior: {
        origin: new S3Origin(frontendBucket, {
          originAccessIdentity: cloudfrontOAI,
        }),
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      defaultRootObject: "index.html",
      errorResponses: [errorResponse403, errorResponse404]
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

    /**
     * S3 Asset
     */
    this.fileShareBucket = new s3.Bucket(this, "FileshareBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: [
              'http://localhost:3000',
              'http://' + distribution.distributionDomainName
            ],
          allowedHeaders: ['*'],
        },
      ],
    });

    // create lambda functions
    const postUploadsHandler = this.createLambda('post-uploads', LAMBDA_POST_UPLOADS_LOCATION) 
    const getUploadHandler = this.createLambda('get-upload', LAMBDA_GET_UPLOAD_LOCATION)
    const postDownloadsHandler = this.createLambda('post-downloads', LAMBDA_POST_DOWNLOADS_LOCATION) 
    const getDownloadHandler = this.createLambda('get-download', LAMBDA_GET_DOWNLOAD_LOCATION) 

    // POST /uploads
    uploads.addMethod('POST',  new apigateway.LambdaIntegration(postUploadsHandler));  
    // GET /uploads/{key} 
    upload.addMethod('GET',  new apigateway.LambdaIntegration(getUploadHandler));   

    // POST /downloads
    downloads.addMethod('POST',  new apigateway.LambdaIntegration(postDownloadsHandler));   
    // GET /downloads/{key} 
    download.addMethod('GET',  new apigateway.LambdaIntegration(getDownloadHandler));   

    this.fileShareBucket.grantRead(postDownloadsHandler);
    this.fileShareBucket.grantWrite(postUploadsHandler);

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
    new cdk.CfnOutput(this, 'CloudfrontDomain', { value: "https://" + distribution.domainName });
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
          FILE_SHARE_BUCKET: this.fileShareBucket.bucketName
        },
        bundling: {
          goBuildFlags: ['-ldflags "-s -w"'],
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
