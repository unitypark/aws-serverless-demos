import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import { CfnDistribution, CloudFrontAllowedCachedMethods, CloudFrontAllowedMethods, CloudFrontWebDistribution, Distribution, KeyGroup, LambdaEdgeEventType, OriginAccessIdentity, PublicKey, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import path = require('path');
import { GoLambdaFunction } from './construct/goLambdaFunction';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { CorsHttpMethod, HttpApi, HttpMethod, PayloadFormatVersion } from '@aws-cdk/aws-apigatewayv2-alpha';
import { CognitoUser } from "./construct/cognito-user"
import { CrossRegionParameter } from "./construct/cross-region-parameter";
import { NodeLambdaEdgeFunction } from './construct/edge-lambda';
import { CognitoUserPool } from './construct/cognito';
import { HttpLambdaAuthorizer, HttpLambdaResponseType, HttpUserPoolAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { Duration } from 'aws-cdk-lib';

enum HttpStatus {
  OK = 200,
  Unauthorized = 403,
  NotFound = 404
}

enum LambdaType {
  API = 'api',
  AUTH = 'auth'
}

enum UserRole {
  ADMIN = 'ADMIN',
  DEFAULT = 'DEFAULT'
}

interface Props extends cdk.StackProps {
  appPrefix: string
  edgeRegion: string
}

export class FileShareServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const LAMBDA_PREFIX = '../lambda/cmd'
    const LAMBDA_GET_CONFIG_LOCATION = `${LAMBDA_PREFIX}/${LambdaType.API}/getConfig/main.go`
    const LAMBDA_POST_DOWNLOADS_LOCATION = `${LAMBDA_PREFIX}/${LambdaType.API}/postDownloads/main.go`
    const LAMBDA_GET_DOWNLOAD_LOCATION = `${LAMBDA_PREFIX}/${LambdaType.API}/getDownload/main.go`
    const LAMBDA_API_AUTHORIZER_LOCATION = `${LAMBDA_PREFIX}/${LambdaType.AUTH}/main.go`

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
    const cognito = new CognitoUserPool(this, props.appPrefix + '-cognito-userPool', {
      region: this.region,
      appPrefix: props.appPrefix,
    });

    const cognitoAdminRoleUser = new CognitoUser(this, props.appPrefix + '-cognito-admin-user', {
      username: 'iam',
      role: UserRole.ADMIN,
      userAttributes: [ 
        {
          Name: 'custom:role',
          Value: UserRole.ADMIN
        }
      ],
      userPool: cognito.userPool,
    });
    const cognitoDefaultRoleUser = new CognitoUser(this, props.appPrefix + '-cognito-default-user', {
      username: 'youare',
      role: UserRole.DEFAULT,
      userAttributes: [ 
        {
          Name: 'custom:role',
          Value: UserRole.DEFAULT
        }
      ],
      userPool: cognito.userPool,
    });

    /** 
     * HTTP API
    */
    const httpApi = new HttpApi(this, props.appPrefix + '-http-api', {
      description: props.appPrefix + '-http-api',
      //TODO: update authrozation, admin => cognito authorizer, non-admin => x-origin-verify
      // https://aws.amazon.com/blogs/networking-and-content-delivery/restricting-access-http-api-gateway-lambda-authorizer/ 
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
      errorCachingMinTtl: 0,
    };

    const errorResponse404: CfnDistribution.CustomErrorResponseProperty = {
      errorCode: HttpStatus.NotFound,
      // the properties below are optional
      responseCode: HttpStatus.OK,
      responsePagePath: '/index.html',
      errorCachingMinTtl: 0,
    };

    /**
     * Distribution for Admin Origin
     */    
    const distribution = new CloudFrontWebDistribution(this, props.appPrefix + '-distribution', {
      comment: props.appPrefix + '-distribution',
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
              defaultTtl: Duration.seconds(0),
              minTtl: Duration.seconds(0),
              maxTtl: Duration.seconds(1),
              pathPattern: "api/*",
              allowedMethods: CloudFrontAllowedMethods.ALL,
              cachedMethods: CloudFrontAllowedCachedMethods.GET_HEAD,
              forwardedValues: {
                queryString: true,
                // By default CloudFront will not forward any headers through.
                // so if your API needs authentication make sure you forward auth headers across
                headers: ["Authorization", "authorization"], 
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
              defaultTtl: Duration.seconds(0),
              minTtl: Duration.seconds(0),
              maxTtl: Duration.seconds(1),
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
    const distributionUrl = `https://${distribution.distributionDomainName}`;

    cognito.addClient('userPool-app-client', [
      distributionUrl,
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
      distribution: distribution,
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
            s3.HttpMethods.HEAD,
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: [
              'http://localhost:3000',
              distributionUrl,
            ],
          allowedHeaders: ['*'],
        },
      ],
    });

    /** 
     * API Lambda Function
    */    
    const getConfigHandler = new GoLambdaFunction(this, props.appPrefix + '-get-config', {
      name: props.appPrefix + '-get-config',
      entry: LAMBDA_GET_CONFIG_LOCATION,
    });

    const postDownloadsHandler = new GoLambdaFunction(this, props.appPrefix + '-post-downloads', {
      name: props.appPrefix + '-post-downloads',
      entry: LAMBDA_POST_DOWNLOADS_LOCATION,
      environmentVariables: {
        'URL_TABLE': ddbTable.tableName,
        'FILE_SHARE_BUCKET': fileShareBucket.bucketName,
      }
    });
    fileShareBucket.grantRead(postDownloadsHandler.fn);
    
    const getDownloadHandler = new GoLambdaFunction(this, props.appPrefix + '-get-download', {
      name: props.appPrefix + '-get-download',
      entry: LAMBDA_GET_DOWNLOAD_LOCATION,
      environmentVariables: {
        'URL_TABLE': ddbTable.tableName,
        'FILE_SHARE_BUCKET': fileShareBucket.bucketName,
      }
    })
    ddbTable.grantFullAccess(postDownloadsHandler.fn);
    ddbTable.grantFullAccess(getDownloadHandler.fn);

    /**
     * Authorizer
     */
    const authHandler = new GoLambdaFunction(this, props.appPrefix + '-api-authorizer', {
      name: props.appPrefix + '-api-authorizer',
      entry: LAMBDA_API_AUTHORIZER_LOCATION,
      environmentVariables: {
        'URL_TABLE': ddbTable.tableName,
        'FILE_SHARE_BUCKET': fileShareBucket.bucketName,
        'JWKS_URL': `https://cognito-idp.${this.region}.amazonaws.com/${cognito.userPool.userPoolId}/.well-known/jwks.json`,
        'ISS': `https://cognito-idp.${this.region}.amazonaws.com/${cognito.userPool.userPoolId}`,
        'COGNITO_USER_POOL_CLIENT_ID': cognito.userPoolClient.userPoolClientId,
        'ADMIN_ROLE_NAME': UserRole.ADMIN
      }
    });
    const lambdaAuthorizer = new HttpLambdaAuthorizer(props.appPrefix + '-admin-authorizer', authHandler.fn, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
    });

    /**
     * Api Integration
     */
    const apiRouteName = 'api'
    httpApi.addRoutes({
      path: `/${apiRouteName}/config`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('get-config-integration', getConfigHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: lambdaAuthorizer,
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/downloads`,
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('post-downloads-integration', postDownloadsHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: lambdaAuthorizer,
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/downloads/{key}`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('get-download-integration', getDownloadHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: lambdaAuthorizer,
    });

    /**
     * Put Cognito Values to SSM in us-east-1
     */
    new CrossRegionParameter(this, props.appPrefix + '-ssm-cognito-userPool-id', {
      region: props.edgeRegion,
      name: `/${props.appPrefix}/cognito/userpool/id`,
      value: cognito.userPool.userPoolId,
    });
    new CrossRegionParameter(this, props.appPrefix + '-ssm-cognito-userPool-client-id', {
      region: props.edgeRegion,
      name: `/${props.appPrefix}/cognito/userpool/client/id`,
      value: cognito.userPoolClient.userPoolClientId,
    });
    new CrossRegionParameter(this, props.appPrefix + '-ssm-cognito-userPool-domain', {
      region: props.edgeRegion,
      name: `/${props.appPrefix}/cognito/userpool/domain`,
      value: cognito.cognitoDomain,
    });
    
    new cdk.CfnOutput(this, 'FileShareBucketName', { value: fileShareBucket.bucketName });
    new cdk.CfnOutput(this, 'CloudfrontAdminDistributionDomain', { value: distributionUrl });
    new cdk.CfnOutput(this, 'AdminUsername', { value: cognitoAdminRoleUser.username });
    new cdk.CfnOutput(this, 'AdminPassword', { value: cognitoAdminRoleUser.password });
    new cdk.CfnOutput(this, 'ClientUsername', { value: cognitoDefaultRoleUser.username });
    new cdk.CfnOutput(this, 'ClientPassword', { value: cognitoDefaultRoleUser.password });
  }
}
