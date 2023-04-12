import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as apigw from '@aws-cdk/aws-apigatewayv2-alpha'
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import { CfnDistribution, CloudFrontAllowedMethods, CloudFrontWebDistribution, LambdaEdgeEventType, OriginAccessIdentity, OriginProtocolPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import path = require('path');
import { OAuthScope, UserPool, UserPoolClientIdentityProvider } from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy, StackProps } from 'aws-cdk-lib';
import { GoLambdaFunction } from './construct/goLambdaFunction';
import { NodeEdgeLambdaFunction } from './construct/edgeFunction';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { CorsHttpMethod, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import CognitoPassword from 'aws-cognito-temporary-password-generator';

export class StaticSiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const appPrefix = 'file-share'
    
    const API_LAMBDA_PREFIX = '../api/cmd'
    const LAMBDA_POST_DOWNLOADS_LOCATION = `${API_LAMBDA_PREFIX}/postDownloads/main.go`
    const LAMBDA_GET_DOWNLOAD_LOCATION = `${API_LAMBDA_PREFIX}/getDownload/main.go`

    const CUSTOM_RESOURCE_LAMBDA_PREFIX = '../customresource/cmd'
    const LAMBDA_ON_EVENT_LOCATION = `${CUSTOM_RESOURCE_LAMBDA_PREFIX}/onEvent/main.go`

    /**
     * DynamoDB
     */
    const ddbTable = new ddb.Table(this, appPrefix + '-table', {
      tableName: appPrefix + '-table',
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
    const httpApi = new apigw.HttpApi(this, appPrefix + '-http-api', {
      description: appPrefix + '-http-api',
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
          CorsHttpMethod.PUT,
          CorsHttpMethod.PATCH,
          CorsHttpMethod.DELETE,
        ],
        allowCredentials: true,
      },
    });

    /**
     * Cloudfront 
     */
    const staticBucket = new s3.Bucket(this, appPrefix + '-wesite-bucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: true,
    });
    const cloudfrontOAI = new OriginAccessIdentity(this, "OAI", {
      comment: appPrefix + '-OAI',
    });

    const cloudfrontS3Access = new iam.PolicyStatement();
    cloudfrontS3Access.addActions("s3:GetBucket*");
    cloudfrontS3Access.addActions("s3:GetObject*");
    cloudfrontS3Access.addActions("s3:List*");
    cloudfrontS3Access.addResources(staticBucket.bucketArn);
    cloudfrontS3Access.addResources(`${staticBucket.bucketArn}/*`);
    cloudfrontS3Access.addCanonicalUserPrincipal(
      cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
    );
    staticBucket.addToResourcePolicy(cloudfrontS3Access);

    const errorResponse403: CfnDistribution.CustomErrorResponseProperty = {
      errorCode: 403,
      // the properties below are optional
      responseCode: 200,
      responsePagePath: '/index.html',
      errorCachingMinTtl: 10,
    };

    const errorResponse404: CfnDistribution.CustomErrorResponseProperty = {
      errorCode: 404,
      // the properties below are optional
      responseCode: 200,
      responsePagePath: '/index.html',
      errorCachingMinTtl: 10,
    };

    // Add a Lambda@Edge to add CORS headers to the API.
    const apiCorsLambda = new NodeEdgeLambdaFunction(this, appPrefix + '-api-cors', {
      name: appPrefix + '-api-cors',
      handler: 'cors.onOriginResponse',
    })
    
    // Add a Lambda@Edge to rewrite paths and add redirects headers to the static site.
    const staticRewriteLambda = new NodeEdgeLambdaFunction(this, appPrefix + '-static-rewrite', {
      name: appPrefix + '-static-rewrite',
      handler: 'rewrite.onViewerRequest',
    })
    
    // Create Cloudfront distribution with S3 as Origin
    const distribution = new CloudFrontWebDistribution(this, appPrefix + '-distribution', {
      comment: appPrefix + 'web-distribution',
      errorConfigurations: [errorResponse403, errorResponse404],
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      defaultRootObject: 'index.html',
      originConfigs: [
        {
          customOriginSource: {
            domainName: `${httpApi.httpApiId}.execute-api.${this.region}.${this.urlSuffix}`,
            // don't type it, if http api does not have specific stage value
            //originPath: ''
          },
          behaviors: [
            {
              lambdaFunctionAssociations: [
                {
                  lambdaFunction: apiCorsLambda.fn,
                  eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
                },
              ],
              allowedMethods: CloudFrontAllowedMethods.ALL,
              pathPattern: "api/*",
            },
          ],
        },
        {
          s3OriginSource: {
            s3BucketSource: staticBucket,
            originAccessIdentity: cloudfrontOAI,
          },
          behaviors: [
            {
              lambdaFunctionAssociations: [
                {
                  lambdaFunction: staticRewriteLambda.fn,
                  eventType: LambdaEdgeEventType.VIEWER_REQUEST,
                },
              ],
              isDefaultBehavior: true,
            },
          ],
        },
      ],      
    });
    const distributionUrl = "https://" + distribution.distributionDomainName;

    new BucketDeployment(this, "deployStaticWebsite", {
      sources: [
        Source.asset(`${path.resolve(__dirname)}/../../ui/build`),
      ],
      destinationBucket: staticBucket,
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
    const fileShareBucket = new s3.Bucket(this, appPrefix + '-bucket', {
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
              distributionUrl
            ],
          allowedHeaders: ['*'],
        },
      ],
    });

    const apiRouteName = 'api'
    // create lambda functions
    const postDownloadsHandler = new GoLambdaFunction(this, appPrefix + '-post-downloads', {
      name: appPrefix + '-post-downloads',
      entry: LAMBDA_POST_DOWNLOADS_LOCATION,
      environmentVariables: {
        URL_TABLE: ddbTable.tableName,
        FILE_SHARE_BUCKET: fileShareBucket.bucketName
      }
    });
    fileShareBucket.grantRead(postDownloadsHandler.fn);
    
    const getDownloadHandler = new GoLambdaFunction(this, appPrefix + '-get-download', {
      name: appPrefix + '-get-download',
      entry: LAMBDA_GET_DOWNLOAD_LOCATION,
      environmentVariables: {
        URL_TABLE: ddbTable.tableName,
        FILE_SHARE_BUCKET: fileShareBucket.bucketName
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
     * Cognito
     */
    const userPool = new UserPool(this, "cognito-userPool", {
      userPoolName: appPrefix + '-userPool',
      removalPolicy: RemovalPolicy.DESTROY,
    });
    userPool.addDomain("domain", {
      cognitoDomain: {
        domainPrefix: appPrefix,
      },
    });

    userPool.addClient("userpool-app-client", {
      userPoolClientName: appPrefix+ '-app-client',
      authFlows: {
        adminUserPassword: false,
        custom: true,
        userPassword: true,
        userSrp: true,
      },
      disableOAuth: false,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
          clientCredentials: false,
        },
        callbackUrls: [
          'http://localhost:3000',
          distributionUrl,
        ],
        scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE],
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO
      ],
    });

    /** 
     * CUSTOM RESOURCE ONEVENT HANDLER
    */
    const onEventLambda = new GoLambdaFunction(this, appPrefix + '-on-event', {
      name: appPrefix + '-on-event',
      entry: LAMBDA_ON_EVENT_LOCATION,
      environmentVariables: {
        FILE_SHARE_BUCKET: fileShareBucket.bucketName
      }
    })

    // https://github.com/aws/aws-cdk/issues/11549#issuecomment-1308805103
    onEventLambda.fn.addToRolePolicy(new iam.PolicyStatement({
      actions:['logs:CreateLogGroup'],
      resources:['*'],
      effect: iam.Effect.DENY
    }));
    onEventLambda.fn.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonCognitoPowerUser")
    );
    
    // Reference - https://github.com/hugtechio/aws-cognito-temporary-password-generator
    const generator = new CognitoPassword()
    const userPoolAdminUsername = 'admin'
    const userPoolAdminPassword = generator.generate()
    
    new cdk.CustomResource(this, appPrefix + '-custom-resource', {
      resourceType: 'Custom::InjectReactRuntimeConfiguration',
      serviceToken: onEventLambda.fn.functionArn,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      properties: {
        "userpoolId": userPool.userPoolId,
        "userPoolAdminUsername": userPoolAdminUsername,
        "userPoolAdminPassword": userPoolAdminPassword,
      },
    });

    new cdk.CfnOutput(this, 'FileShareBucketName', { value: fileShareBucket.bucketName });
    new cdk.CfnOutput(this, 'CloudfrontDistributionDomain', { value: distributionUrl });
    new cdk.CfnOutput(this, 'AdminUsername', { value: userPoolAdminUsername });
    new cdk.CfnOutput(this, 'AdminPassword', { value: userPoolAdminPassword });
  }
}
