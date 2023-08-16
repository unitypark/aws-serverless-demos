import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { CognitoUserPool } from './construct/cognito';
import { CorsHttpMethod, HttpApi, HttpMethod, PayloadFormatVersion } from '@aws-cdk/aws-apigatewayv2-alpha';
import { BlockPublicAccess, Bucket, BucketEncryption, HttpMethods, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { AllowedMethods, CacheCookieBehavior, CachePolicy, CacheQueryStringBehavior, Function, Distribution, EdgeLambda, ErrorResponse, FunctionCode, FunctionEventType, LambdaEdgeEventType, OriginAccessIdentity, OriginProtocolPolicy, OriginRequestPolicy, OriginSslPolicy, ResponseHeadersPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import * as serverless from 'aws-cdk-lib/aws-sam';
import { HttpOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import path = require('path');
import { Version } from 'aws-cdk-lib/aws-lambda';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { GoLambdaFunction } from './construct/goLambdaFunction';
import { HttpLambdaAuthorizer, HttpLambdaResponseType } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';

enum HttpStatus {
  OK = 200,
  Unauthorized = 403,
  NotFound = 404
}

enum LambdaType {
  API = 'api',
  AUTH = 'auth'
}

interface FileShareServiceProps extends cdk.StackProps {
  prefix: string
  domain: string
  hostedZone: IHostedZone
  certificate: Certificate
}

export class FileShareService extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FileShareServiceProps) {
    super(scope, id, props);

    const ID_TOKEN_VALIDITY = cdk.Duration.seconds(300);
    const ACCESS_TOKEN_VALIDITY = cdk.Duration.seconds(300);
    const REFRESH_TOKEN_VALIDITY = cdk.Duration.seconds(3600);

    const FILE_SHARE_SERVICE_URL = `https://${props.domain}`

    const API_LAMBDA_PREFIX = '../api/cmd'
    const LAMBDA_POST_UPLOADS_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.API}/postUploads/main.go`
    const LAMBDA_POST_DOWNLOADS_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.API}/postDownloads/main.go`
    const LAMBDA_GET_DOWNLOAD_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.API}/getDownload/main.go`
    const LAMBDA_API_AUTHORIZER_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.AUTH}/main.go`

    /**
     * DynamoDB
     */
    const ddbTable = new Table(this, "DdbTable", {
      tableName: props.prefix + '-table',
      billingMode: BillingMode.PROVISIONED,
      partitionKey: {
          name: 'PK',
          type: AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    /**
     * Cognito
     */
    const cognito = new CognitoUserPool(this, "CognitoUserPool", {
      region: this.region,
      appPrefix: props.prefix,
    });

    cognito.addClient(
      `${props.prefix}-userPool-app-client`, 
      [
      'http://localhost:3000/signin',
      FILE_SHARE_SERVICE_URL + "/signin"
      ],
      [
        'http://localhost:3000/',
        FILE_SHARE_SERVICE_URL + "/",
      ],
      {
        idToken: ID_TOKEN_VALIDITY,
        accessToken: ACCESS_TOKEN_VALIDITY,
        refreshToken: REFRESH_TOKEN_VALIDITY,
      }
    );

    /** 
     * HTTP API
    */
    const httpApi = new HttpApi(this, "HttpApi", {
      description: props.prefix + '-http-api',
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
    const fileShareServiceWebSiteBucket = new Bucket(this, "FileShareServiceWebSiteBucket", {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: true,
    });

        
    /**
     * Cloudfront 
     */
    const cloudfrontOAI = new OriginAccessIdentity(this, "OriginAccessIdentity", {
      comment: props.prefix + '-oai',
    });
    fileShareServiceWebSiteBucket.grantRead(cloudfrontOAI);


    const errorResponse404: ErrorResponse = {
      httpStatus: HttpStatus.NotFound,
      responseHttpStatus: HttpStatus.OK,
      responsePagePath: "/index.html",
      ttl: cdk.Duration.seconds(0),
    };

    const apiOriginCachePolicy = new CachePolicy(this, "ApiOriginCachePolicy", {
      cachePolicyName: props.prefix + '-api-origin-cache-policy',
      comment: "api origin cache policy in distritbution",
      defaultTtl: cdk.Duration.seconds(0),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      cookieBehavior: CacheCookieBehavior.all(),
      queryStringBehavior: CacheQueryStringBehavior.all(),
    });

    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example-function-add-security-headers.html
    // https://dev.to/kumo/deliver-perfect-http-security-headers-with-aws-cloudfront-4din
    const httpHeaders = JSON.stringify({
      "Content-Security-Policy":
        "default-src 'none'; img-src 'self'; script-src 'self' https://code.jquery.com https://stackpath.bootstrapcdn.com; style-src 'self' 'unsafe-inline' https://stackpath.bootstrapcdn.com; object-src 'none'; connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com",
      "Strict-Transport-Security":
        "max-age=31536000; includeSubdomains; preload",
      "Referrer-Policy": "same-origin",
      "X-XSS-Protection": "1; mode=block",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
    });

    const distributionLoggingPrefix = "distribution-access-logs/";
    const distributionLoggingBucket = new Bucket(
      this,
      "DistributionLoggingBucket",
      {
        objectOwnership: ObjectOwnership.OBJECT_WRITER,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        publicReadAccess: false,
        lifecycleRules: [
          {
            prefix: distributionLoggingPrefix,
            abortIncompleteMultipartUploadAfter: cdk.Duration.days(90),
            expiration: cdk.Duration.days(90),
          },
        ],
      }
    );

    const dummyorigin = new HttpOrigin('will-never-be-reached.org', {
      protocolPolicy: OriginProtocolPolicy.MATCH_VIEWER,
      originSslProtocols: [OriginSslPolicy.SSL_V3]
    });

    const cookieSettings = JSON.stringify({
      accessToken: `Path=/api; Secure; HttpOnly; Max-Age=300; Domain=${props.domain}; SameSite=Lax`,
      idToken: `Path=/; Secure; HttpOnly; Max-Age=3600; Domain=${props.domain}; SameSite=Lax`,
      refreshToken: `Path=/refreshauth; Secure; HttpOnly; Max-Age=3600; Domain=${props.domain}; SameSite=Lax`,
      cognitoEnabled: `Path=/tmp; Secure; Domain=${props.domain}; SameSite=Lax`,
    });

    const authAtEdge = new serverless.CfnApplication(this, "AuthorizationAtEdge", {
      location: {
        applicationId:
          "arn:aws:serverlessrepo:us-east-1:520945424137:applications/cloudfront-authorization-at-edge",
        semanticVersion: "2.1.7",
      },
      parameters: {
        CookieCompatibility: "elasticsearch",
        CreateCloudFrontDistribution: "false",
        EnableSPAMode: "false",
        HttpHeaders: httpHeaders,
        LogLevel: "none",
        OAuthScopes: "email, profile, openid",
        OriginAccessIdentity: cloudfrontOAI.originAccessIdentityId,
        RedirectPathSignIn: "/signin",
        RedirectPathSignOut: "/",
        RewritePathWithTrailingSlashToIndex: "false",
        SignOutUrl: "/signout",
        UserPoolArn: cognito.userPool.userPoolArn,
        UserPoolAuthDomain: cognito.cognitoDomain,
        UserPoolClientId: cognito.userPoolClient.userPoolClientId,
        UserPoolClientSecret: cognito.userPoolClient.userPoolClientSecret.unsafeUnwrap(),
        RedirectPathAuthRefresh: "/refreshauth",
        S3OriginDomainName: `${fileShareServiceWebSiteBucket.bucketName}.s3.${this.region}.amazonaws.com`,
        AlternateDomainNames: props.domain,
        CloudFrontAccessLogsBucket: `${distributionLoggingBucket.bucketName}.s3.${this.region}.amazonaws.com`,
        DefaultRootObject: "index.html",
        CookieSettings: cookieSettings,
      },
    });

    // log for cloudfront function can be accessed in cloudwatch in us-east-1 region
    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-logs.html
    // CloudFront Function is deployed with the CloudFront distribution in the region of your choice. (eu-west-1)
    const checkAuthFunction = new Function(this, "ViewerRequestAuthFunction", {
      comment: "function to handle expired jwt token session",
      code: FunctionCode.fromFile({
        filePath: `${path.resolve(__dirname)}/../../cloudfront/auth.js`,
      }),
    });

    /**
     * Edge@Lambda
     */
    // This is the edge lambda for the api endpoint to handle refreshing jwt tokens, if it's expired
    const checkOriginAuthEdge: EdgeLambda = {
      eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
      functionVersion: Version.fromVersionArn(this, "CheckOriginAuthHandler", authAtEdge.getAtt("Outputs.CheckAuthHandler").toString())
    };
    // This is the edge lambda for the web app (default) endpoint to handle jwt tokens, if it's expired or does not exist for sign-in
    const checkViewerAuthEdge: EdgeLambda = {
      eventType: LambdaEdgeEventType.VIEWER_REQUEST,
      functionVersion: Version.fromVersionArn(this, "CheckViewerAuthHandler", authAtEdge.getAtt("Outputs.CheckAuthHandler").toString())
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
      "Distribution",
      {
        comment: `${props.prefix}-distribution`,
        certificate: props.certificate,
        domainNames: [ props.domain ],
        defaultRootObject: "index.html",
        errorResponses: [errorResponse404],
        logBucket: distributionLoggingBucket,
        logFilePrefix: distributionLoggingPrefix,
        logIncludesCookies: true,
        defaultBehavior: {
          origin: new S3Origin(fileShareServiceWebSiteBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          compress: true,
          edgeLambdas: [checkViewerAuthEdge],
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
        }
      }
    );

    new ARecord(this, "DistributionARecord", {
      recordName: props.domain,
      zone: props.hostedZone,
      target: RecordTarget.fromAlias(
        new CloudFrontTarget(distribution)
      ),
    });

    // api path
    distribution.addBehavior("/api/*", new HttpOrigin(`${httpApi.httpApiId}.execute-api.${this.region}.${this.urlSuffix}`), {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      compress: true,
      functionAssociations: [
        {
          function: checkAuthFunction,
          eventType: FunctionEventType.VIEWER_REQUEST,
        },
      ],
      edgeLambdas: [checkOriginAuthEdge],
      cachePolicy: apiOriginCachePolicy,
      // https://stackoverflow.com/questions/71367982/cloudfront-gives-403-when-origin-request-policy-include-all-headers-querystri
      originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
    });

    distribution.addBehavior("/signin", dummyorigin, {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      edgeLambdas: [parseAuthEdge],
      responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
    });
    distribution.addBehavior("/signout", dummyorigin, {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      edgeLambdas: [signOutEdge],
      responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
    });
    distribution.addBehavior("/refreshauth", dummyorigin, {
      allowedMethods: AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      edgeLambdas: [refreshAuthEdge],
      responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
    });

    new BucketDeployment(this, props.prefix + 'BucketDeployment', {
      sources: [
        Source.asset(`${path.resolve(__dirname)}/../../website/build`),
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
    const fileShareAssetBucket = new Bucket(this, "FileShareAssetBucket", {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: true,
      cors: [
        {
          allowedMethods: [
            HttpMethods.HEAD,
            HttpMethods.GET,
            HttpMethods.POST,
            HttpMethods.PUT,
          ],
          allowedOrigins: [
              'http://localhost:3000',
              FILE_SHARE_SERVICE_URL,
            ],
          allowedHeaders: ['*'],
        },
      ],
    });

    /** 
     * API Lambda Function
    */    
    const postUploadsHandler = new GoLambdaFunction(this, "PostUploadsHandler", {
      name: props.prefix + '-post-uploads',
      entry: LAMBDA_POST_UPLOADS_LOCATION,
      environmentVariables: {
        'URL_TABLE': ddbTable.tableName,
        'FILE_SHARE_BUCKET': fileShareAssetBucket.bucketName,
      }
    });
    fileShareAssetBucket.grantPut(postUploadsHandler.fn);
    fileShareAssetBucket.grantPutAcl(postUploadsHandler.fn);

    const postDownloadsHandler = new GoLambdaFunction(this, "PostDownloadsHandler", {
      name: props.prefix + '-post-downloads',
      entry: LAMBDA_POST_DOWNLOADS_LOCATION,
      environmentVariables: {
        'URL_TABLE': ddbTable.tableName,
        'FILE_SHARE_BUCKET': fileShareAssetBucket.bucketName,
      }
    });
    fileShareAssetBucket.grantRead(postDownloadsHandler.fn);

    const getDownloadHandler = new GoLambdaFunction(this, "GetDownloadHandler", {
      name: props.prefix + '-get-download',
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
    const authorizerHandler = new GoLambdaFunction(this, "AuthorizerHandler", {
      name: props.prefix + '-api-authorizer',
      entry: LAMBDA_API_AUTHORIZER_LOCATION,
      environmentVariables: {
        'URL_TABLE': ddbTable.tableName,
        'FILE_SHARE_BUCKET': fileShareAssetBucket.bucketName,
        'JWKS_URL': `https://cognito-idp.${this.region}.amazonaws.com/${cognito.userPool.userPoolId}/.well-known/jwks.json`,
        'ISS': `https://cognito-idp.${this.region}.amazonaws.com/${cognito.userPool.userPoolId}`,
        'COGNITO_USER_POOL_CLIENT_ID': cognito.userPoolClient.userPoolClientId,
      }
    });
    const lambdaAuthorizer = new HttpLambdaAuthorizer(props.prefix + '-cookie-authorizer', authorizerHandler.fn, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
      identitySource: ["$request.header.Cookie", "$request.header.cookie"]
    });

    /**
     * Api Integration
     */
    const apiRouteName = 'api'
    httpApi.addRoutes({
      path: `/${apiRouteName}/uploads`,
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(props.prefix + '-post-uploads-integration', postUploadsHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: lambdaAuthorizer,
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/downloads`,
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(props.prefix + '-post-downloads-integration', postDownloadsHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: lambdaAuthorizer,
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/downloads/{key}`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(props.prefix + '-get-download-integration', getDownloadHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: lambdaAuthorizer,
    });
    
    new cdk.CfnOutput(this, 'FileShareSerivceUrl', { value: FILE_SHARE_SERVICE_URL});
  }
}
