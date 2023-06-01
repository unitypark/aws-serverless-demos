import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import { AllowedMethods, CacheCookieBehavior, CachePolicy, CacheQueryStringBehavior, CachedMethods, Distribution, EdgeLambda, ErrorResponse, LambdaEdgeEventType, OriginAccessIdentity, OriginProtocolPolicy, OriginSslPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import path = require('path');
import { GoLambdaFunction } from './construct/goLambdaFunction';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { CorsHttpMethod, HttpApi, HttpMethod, PayloadFormatVersion } from '@aws-cdk/aws-apigatewayv2-alpha';
import { CrossRegionParameter } from "./construct/cross-region-parameter";
import { CognitoUserPool } from './construct/cognito';
import { HttpLambdaAuthorizer, HttpLambdaResponseType } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { Duration } from 'aws-cdk-lib';
import { HttpOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, PublicHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import * as serverless from 'aws-cdk-lib/aws-sam';
import { Version } from 'aws-cdk-lib/aws-lambda';

enum HttpStatus {
  OK = 200,
  Unauthorized = 403,
  NotFound = 404
}

enum LambdaType {
  API = 'api',
  AUTH = 'auth'
}
interface Props extends cdk.StackProps {
  appPrefix: string
  edgeRegion: string
  protectedDomainName: string
  certificate: Certificate
}

export class FileShareProtectedServiceStack extends cdk.Stack {
  public readonly cloudfrontOAI: cdk.aws_cloudfront.OriginAccessIdentity;
  public readonly cognito: CognitoUserPool;
  public readonly s3OriginDomainName: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const API_LAMBDA_PREFIX = '../lambda/api/cmd'
    const LAMBDA_GET_CONFIG_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.API}/getConfig/main.go`
    const LAMBDA_POST_UPLOADS_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.API}/postUploads/main.go`
    const LAMBDA_POST_DOWNLOADS_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.API}/postDownloads/main.go`
    const LAMBDA_GET_DOWNLOAD_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.API}/getDownload/main.go`
    const LAMBDA_API_AUTHORIZER_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.AUTH}/main.go`

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
    this.cognito = new CognitoUserPool(this, props.appPrefix + '-cognito-userPool', {
      region: this.region,
      appPrefix: props.appPrefix,
    });

    /** 
     * HTTP API
    */
    const httpApi = new HttpApi(this, props.appPrefix + '-http-api', {
      description: props.appPrefix + '-http-api',
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
     * S3 Website bucket 
     */
    const fileShareServiceWebSiteBucket = new s3.Bucket(this, props.appPrefix + '-fileshare-service-website-bucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: true,
    });

    this.s3OriginDomainName = `${fileShareServiceWebSiteBucket.bucketName}.s3.${this.region}.amazonaws.com`

    const fileshareServiceUrl = `https://${props.protectedDomainName}`
    
    this.cognito.addClient(
      `${props.appPrefix}-userPool-app-client`, 
      [
      'http://localhost:3000/signin',
      fileshareServiceUrl + "/signin"
      ],
      [
        'http://localhost:3000/signout',
        fileshareServiceUrl + "/",
      ]
    );

    /**
     * Cloudfront 
     */
    this.cloudfrontOAI = new OriginAccessIdentity(this, props.appPrefix + '-oai', {
      comment: props.appPrefix + '-oai',
    });
    fileShareServiceWebSiteBucket.grantRead(this.cloudfrontOAI);

    const errorResponse403: ErrorResponse = {
      httpStatus: HttpStatus.Unauthorized,
      responseHttpStatus: HttpStatus.OK,
      responsePagePath: "/index.html",
      ttl: Duration.seconds(0),
    };
    const errorResponse404: ErrorResponse = {
      httpStatus: HttpStatus.NotFound,
      responseHttpStatus: HttpStatus.OK,
      responsePagePath: "/index.html",
      ttl: Duration.seconds(0),
    };

    const webOriginCachePolicy = new CachePolicy(this, "web-origin-cache-policy", {
      cachePolicyName: `${props.appPrefix}-web-origin-cache-policy`,
      comment: "web origin cache policy in distritbution",
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      cookieBehavior: CacheCookieBehavior.none(),
      queryStringBehavior: CacheQueryStringBehavior.none(),
    });

    const apiOriginCachePolicy = new CachePolicy(this, "api-origin-cache-policy", {
      cachePolicyName: `${props.appPrefix}-api-origin-cache-policy`,
      comment: "api origin cache policy in distritbution",
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      cookieBehavior: CacheCookieBehavior.all(),
      queryStringBehavior: CacheQueryStringBehavior.all(),
    });

    const dummyorigin = new HttpOrigin('will-never-be-reached.org', {
      protocolPolicy: OriginProtocolPolicy.MATCH_VIEWER,
      originSslProtocols: [OriginSslPolicy.SSL_V3]
    });

    const httpHeaders = JSON.stringify({"Content-Security-Policy": "default-src 'none'; img-src 'self'; script-src 'self' https://code.jquery.com https://stackpath.bootstrapcdn.com; style-src 'self' 'unsafe-inline' https://stackpath.bootstrapcdn.com; object-src 'none'; connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com",  "Strict-Transport-Security": "max-age=31536000; includeSubdomains; preload",  "Referrer-Policy": "same-origin",  "X-XSS-Protection": "1; mode=block",  "X-Frame-Options": "DENY",  "X-Content-Type-Options": "nosniff"})

    const authAtEdge = new serverless.CfnApplication(this, "AuthorizationAtEdge", {
      location: {
        applicationId:
          "arn:aws:serverlessrepo:us-east-1:520945424137:applications/cloudfront-authorization-at-edge",
        semanticVersion: "2.1.5",
      },
      parameters: {
        CookieCompatibility: "amplify",
        CreateCloudFrontDistribution: "false",
        EnableSPAMode: "false",
        HttpHeaders: httpHeaders,
        LogLevel: "debug",
        OAuthScopes: "email, profile, openid",
        OriginAccessIdentity: this.cloudfrontOAI.originAccessIdentityId,
        RedirectPathSignIn: "/signin",
        RedirectPathSignOut: "/",
        RewritePathWithTrailingSlashToIndex: "false",
        SignOutUrl: "/signout",
        UserPoolArn: this.cognito.userPool.userPoolArn,
        UserPoolAuthDomain: this.cognito.cognitoDomain,
        UserPoolClientId: this.cognito.userPoolClient.userPoolClientId,
        UserPoolClientSecret: this.cognito.userPoolClient.userPoolClientSecret.unsafeUnwrap(),
        RedirectPathAuthRefresh: "/refreshauth",
        S3OriginDomainName: this.s3OriginDomainName,
      },
    });

    /**
     * Edge@Lambda
     */
    const checkAuthEdge: EdgeLambda = {
      eventType: LambdaEdgeEventType.VIEWER_REQUEST,
      functionVersion: Version.fromVersionArn(this, "CheckAuthHandler", authAtEdge.getAtt("Outputs.CheckAuthHandler").toString())
    };
    const parseAuthEdge: EdgeLambda = {
      eventType: LambdaEdgeEventType.VIEWER_REQUEST,
      functionVersion: Version.fromVersionArn(this, "ParseAuthHandler", authAtEdge.getAtt("Outputs.ParseAuthHandler").toString())
    };
    const refreshAuthEdge: EdgeLambda = {
      eventType: LambdaEdgeEventType.VIEWER_REQUEST,
      functionVersion: Version.fromVersionArn(this, "RefreshAuthHandler", authAtEdge.getAtt("Outputs.RefreshAuthHandler").toString())
    };
    const signOutEdge: EdgeLambda = {
      eventType: LambdaEdgeEventType.VIEWER_REQUEST,
      functionVersion: Version.fromVersionArn(this, "SignOutHandler", authAtEdge.getAtt("Outputs.SignOutHandler").toString())
    };
    
    /**
     * Distribution
     */    
    const distribution = new Distribution(
      this,
      `${props.appPrefix}-distribution`,
      {
        comment: `${props.appPrefix}-distribution`,
        certificate: props.certificate,
        domainNames: [ props.protectedDomainName ],
        defaultRootObject: "index.html",
        errorResponses: [errorResponse403, errorResponse404],
        defaultBehavior: {
          origin: new S3Origin(fileShareServiceWebSiteBucket, {
            originAccessIdentity: this.cloudfrontOAI,
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          compress: true,
          edgeLambdas: [checkAuthEdge],
          cachePolicy: webOriginCachePolicy,
        },
        additionalBehaviors: {
          "/api/*": {
            origin: new HttpOrigin(`${httpApi.httpApiId}.execute-api.${this.region}.${this.urlSuffix}`),
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: AllowedMethods.ALLOW_ALL,
            compress: true,
            cachedMethods: CachedMethods.CACHE_GET_HEAD,
            cachePolicy: apiOriginCachePolicy,
          },
        },
      }
    );

    const hostedZone = PublicHostedZone.fromLookup(this, "PublicHostedZoneImport", { 
      domainName: `${props.protectedDomainName}`
    });

    new ARecord(this, 'distribution-ARecord', {
      recordName: props.protectedDomainName,
      zone: hostedZone,
      target: RecordTarget.fromAlias(
        new CloudFrontTarget(distribution)
      ),
    });

    distribution.addBehavior("/signin", dummyorigin, {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      edgeLambdas: [parseAuthEdge]
    });
    distribution.addBehavior("/signout", dummyorigin, {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      edgeLambdas: [signOutEdge]
    });
    distribution.addBehavior("/refreshauth", dummyorigin, {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      edgeLambdas: [refreshAuthEdge]
    });

    new BucketDeployment(this, props.appPrefix + '-deploy-fileshare-service-website-asset', {
      sources: [
        Source.asset(`${path.resolve(__dirname)}/../../website/fileshare/build`),
      ],
      destinationBucket: fileShareServiceWebSiteBucket,
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
    const fileShareAssetBucket = new s3.Bucket(this, props.appPrefix + '-asset-bucket', {
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
              fileshareServiceUrl,
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

    const postUploadsHandler = new GoLambdaFunction(this, props.appPrefix + '-post-uploads', {
      name: props.appPrefix + '-post-uploads',
      entry: LAMBDA_POST_UPLOADS_LOCATION,
      environmentVariables: {
        'URL_TABLE': ddbTable.tableName,
        'FILE_SHARE_BUCKET': fileShareAssetBucket.bucketName,
      }
    });
    fileShareAssetBucket.grantPut(postUploadsHandler.fn);
    fileShareAssetBucket.grantPutAcl(postUploadsHandler.fn);

    const postDownloadsHandler = new GoLambdaFunction(this, props.appPrefix + '-post-downloads', {
      name: props.appPrefix + '-post-downloads',
      entry: LAMBDA_POST_DOWNLOADS_LOCATION,
      environmentVariables: {
        'URL_TABLE': ddbTable.tableName,
        'FILE_SHARE_BUCKET': fileShareAssetBucket.bucketName,
      }
    });
    fileShareAssetBucket.grantRead(postDownloadsHandler.fn);

    const getDownloadHandler = new GoLambdaFunction(this, props.appPrefix + '-get-download', {
      name: props.appPrefix + '-get-download',
      entry: LAMBDA_GET_DOWNLOAD_LOCATION,
      environmentVariables: {
        'URL_TABLE': ddbTable.tableName,
        'FILE_SHARE_BUCKET': fileShareAssetBucket.bucketName,
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
        'FILE_SHARE_BUCKET': fileShareAssetBucket.bucketName,
        'JWKS_URL': `https://cognito-idp.${this.region}.amazonaws.com/${this.cognito.userPool.userPoolId}/.well-known/jwks.json`,
        'ISS': `https://cognito-idp.${this.region}.amazonaws.com/${this.cognito.userPool.userPoolId}`,
        'COGNITO_USER_POOL_CLIENT_ID': this.cognito.userPoolClient.userPoolClientId,
      }
    });
    const lambdaAuthorizer = new HttpLambdaAuthorizer(props.appPrefix + '-cookie-authorizer', authHandler.fn, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
      identitySource: ["$request.header.Cookie", "$request.header.cookie"]
    });

    /**
     * Api Integration
     */
    const apiRouteName = 'api'
    httpApi.addRoutes({
      path: `/${apiRouteName}/config`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(props.appPrefix + '-get-config-integration', getConfigHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: lambdaAuthorizer,
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/uploads`,
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(props.appPrefix + '-post-uploads-integration', postUploadsHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: lambdaAuthorizer,
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/downloads`,
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(props.appPrefix + '-post-downloads-integration', postDownloadsHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: lambdaAuthorizer,
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/downloads/{key}`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(props.appPrefix + '-get-download-integration', getDownloadHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: lambdaAuthorizer,
    });
    
    new cdk.CfnOutput(this, 'FileShareSerivceUrl', { value: fileshareServiceUrl});
  }
}
