import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import { CfnDistribution, CloudFrontAllowedMethods, CloudFrontWebDistribution, Distribution, LambdaEdgeEventType, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import path = require('path');
import { GoLambdaFunction } from './construct/goLambdaFunction';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { CorsHttpMethod, HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { CognitoUser } from "./construct/cognito-user"
import { CrossRegionParameter } from "./construct/cross-region-parameter";
import { NodeLambdaEdgeFunction } from './construct/edge-lambda';
import { CognitoUserPool } from './construct/cognito';
import { HttpUserPoolAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';

enum HttpStatus {
  OK = 200,
  Unauthorized = 403,
  NotFound = 404
}

interface Props extends cdk.StackProps {
  appPrefix: string
  edgeRegion: string
}

export class StaticSiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const API_LAMBDA_PREFIX = '../api/cmd'
    const LAMBDA_POST_DOWNLOADS_LOCATION = `${API_LAMBDA_PREFIX}/postDownloads/main.go`
    const LAMBDA_GET_DOWNLOAD_LOCATION = `${API_LAMBDA_PREFIX}/getDownload/main.go`

    /**
     * DynamoDB
     */
    const ddbTable = new ddb.Table(this, props.appPrefix + '-ddb-table', {
      tableName: props.appPrefix + '-table',
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

    /**
     * Cognito
     */
    const cognitoUserPool = new CognitoUserPool(this, props.appPrefix + '-cognito-userPool', {
      region: this.region,
      appPrefix: props.appPrefix,
    });

    const cognitoAdminUser = new CognitoUser(this, props.appPrefix + '-cognito-admin-user', {
      username: 'admin',
      userPool: cognitoUserPool.userPool,
    });
    /** 
     * HTTP API
    */
    const cognitoAuthorizer = new HttpUserPoolAuthorizer(
      props.appPrefix + '-admin-lambda-authorizer', 
      cognitoUserPool.userPool,
    );

    const httpApi = new HttpApi(this, props.appPrefix + '-http-api', {
      description: props.appPrefix + '-http-api',
      defaultAuthorizer: cognitoAuthorizer,
      createDefaultStage: true,
      corsPreflight: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
          "X-Amz-User-Agent",
          "Content-Encoding",
        ],
        allowMethods: [
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
        ],
        allowCredentials: true,
      },
    });

    /**
     * Edge Lambda Function
     */
    const authLambda = new NodeLambdaEdgeFunction(this, props.appPrefix + '-node-lambda-edge-auth', {
      path: path.join(__dirname, '../../edge/dist'),
      handler: 'lambda.handler'
    })
    authLambda.fn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [
        `arn:aws:ssm:${props.edgeRegion}:${this.account}:parameter/${props.appPrefix}/*`
      ]
    }));

    /**
     * S3 Website bucket 
     */
    const webSiteBucket = new s3.Bucket(this, props.appPrefix + '-web-site-bucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: true,
    });

    /**
     * Cloudfront 
     */
    const cloudfrontOAI = new OriginAccessIdentity(this, props.appPrefix + '-oai', {
      comment: props.appPrefix + '-oai',
    });
    webSiteBucket.grantRead(cloudfrontOAI);

    const errorResponse403: CfnDistribution.CustomErrorResponseProperty = {
      errorCode: HttpStatus.Unauthorized,
      // the properties below are optional
      responseCode: HttpStatus.OK,
      responsePagePath: '/index.html',
      errorCachingMinTtl: 10,
    };

    const errorResponse404: CfnDistribution.CustomErrorResponseProperty = {
      errorCode: HttpStatus.NotFound,
      // the properties below are optional
      responseCode: HttpStatus.OK,
      responsePagePath: '/index.html',
      errorCachingMinTtl: 10,
    };


    /**
     * Distribution for Admin Origin
     */    
    const adminDistribution = new CloudFrontWebDistribution(this, props.appPrefix + '-admin-distribution', {
      comment: props.appPrefix + '-admin-distribution',
      errorConfigurations: [errorResponse403, errorResponse404],
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      defaultRootObject: 'index.html',
      originConfigs: [
        {
          customOriginSource: {
            domainName: `${httpApi.httpApiId}.execute-api.${this.region}.${this.urlSuffix}`,
          },
          // Any URLs that have a path beginning with /api/ are routed to an API Gateway, 
          // which integrates with Lambda Functions which are written in Golang. 
          // All other traffic is routed to an S3 bucket.
          behaviors: [
            {
              pathPattern: "api/*",
              allowedMethods: CloudFrontAllowedMethods.ALL,
              forwardedValues: {
                queryString: true,
                // By default CloudFront will not forward any headers through
                // If your API needs authentication make sure you forward auth headers across
                headers: ["Authorization"], 
              },
            },
          ],
        },
        {
          s3OriginSource: {
            s3BucketSource: webSiteBucket,
            originAccessIdentity: cloudfrontOAI,
          },
          behaviors: [
            {
              compress: true,
              isDefaultBehavior: true,
              allowedMethods: CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
              
              lambdaFunctionAssociations: [
                {
                  lambdaFunction: authLambda.fn,
                  eventType: LambdaEdgeEventType.VIEWER_REQUEST,
                },
              ],
            },
          ],
        }
      ],      
    });
    const adminDistributionUrl = `https://${adminDistribution.distributionDomainName}`;

    const cognitoUserPoolAppClient = cognitoUserPool.addClient('userPool-app-client', [
      adminDistributionUrl,
      'http://localhost:3000',
    ]);

    new BucketDeployment(this, props.appPrefix + '-deploy-web-asset', {
      sources: [
        Source.asset(`${path.resolve(__dirname)}/../../web/build`),
      ],
      destinationBucket: webSiteBucket,
      // By default, files in the destination bucket that don't exist in the source will be deleted when the BucketDeployment resource is created or updated.
      // You can use the option prune: false to disable this behavior, in which case the files will not be deleted.
      prune: false,
      distribution: adminDistribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
    }); 
  
    /**
     * S3 Asset
     */
    const fileShareBucket = new s3.Bucket(this, props.appPrefix + '-file-share-data-bucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
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
              adminDistributionUrl
            ],
          allowedHeaders: ['*'],
        },
      ],
    });

    /** 
     * API Lambda Function
    */
    const apiRouteName = 'api'
    // create lambda functions
    const postDownloadsHandler = new GoLambdaFunction(this, props.appPrefix + '-post-downloads', {
      name: props.appPrefix + '-post-downloads',
      entry: LAMBDA_POST_DOWNLOADS_LOCATION,
      environmentVariables: {
        URL_TABLE: ddbTable.tableName,
        FILE_SHARE_BUCKET: fileShareBucket.bucketName,
      }
    });
    fileShareBucket.grantRead(postDownloadsHandler.fn);
    
    const getDownloadHandler = new GoLambdaFunction(this, props.appPrefix + '-get-download', {
      name: props.appPrefix + '-get-download',
      entry: LAMBDA_GET_DOWNLOAD_LOCATION,
      environmentVariables: {
        URL_TABLE: ddbTable.tableName,
        FILE_SHARE_BUCKET: fileShareBucket.bucketName,
      }
    })
    ddbTable.grantFullAccess(postDownloadsHandler.fn);
    ddbTable.grantFullAccess(getDownloadHandler.fn);

    httpApi.addRoutes({
      path: `/${apiRouteName}/downloads`,
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'post-downloads-integration', 
        postDownloadsHandler.fn,
      )
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/downloads/{key}`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        'get-download-integration', 
        getDownloadHandler.fn,
      )
    });

    /**
     * Put Cognito Values to SSM in us-east-1
     */
    new CrossRegionParameter(this, props.appPrefix + '-ssm-cognito-userPool-id', {
      region: props.edgeRegion,
      name: `/${props.appPrefix}/cognito/userpool/id`,
      value: cognitoUserPool.userPool.userPoolId,
    });
    new CrossRegionParameter(this, props.appPrefix + '-ssm-cognito-userPool-client-id', {
      region: props.edgeRegion,
      name: `/${props.appPrefix}/cognito/userpool/client/id`,
      value: cognitoUserPoolAppClient.userPoolClientId,
    });
    new CrossRegionParameter(this, props.appPrefix + '-ssm-cognito-userPool-domain', {
      region: props.edgeRegion,
      name: `/${props.appPrefix}/cognito/userpool/domain`,
      value: cognitoUserPool.cognitoDomain,
    });

    new cdk.CfnOutput(this, 'CloudfrontAdminDistributionDomain', { value: adminDistributionUrl });
    new cdk.CfnOutput(this, 'AdminUsername', { value: cognitoAdminUser.username });
    new cdk.CfnOutput(this, 'AdminPassword', { value: cognitoAdminUser.password });
  }
}
