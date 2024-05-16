import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { CognitoUserPool } from "./construct/cognito";
import {
  HttpApi,
  HttpMethod,
  PayloadFormatVersion,
} from "aws-cdk-lib/aws-apigatewayv2";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  ObjectOwnership,
} from "aws-cdk-lib/aws-s3";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  EdgeLambda,
  LambdaEdgeEventType,
  OriginAccessIdentity,
  OriginProtocolPolicy,
  OriginRequestPolicy,
  OriginSslPolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
  experimental,
} from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import path = require("path");
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import {
  BucketDeployment,
  CacheControl,
  Source,
} from "aws-cdk-lib/aws-s3-deployment";
import { GoLambdaFunction } from "./construct/goLambdaFunction";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

enum LambdaType {
  API = "api",
  AUTH = "auth",
}

interface FileShareServiceProps extends cdk.StackProps {
  prefix: string;
}

export class FileShareService extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FileShareServiceProps) {
    super(scope, id, props);

    const ID_TOKEN_VALIDITY = cdk.Duration.seconds(300);
    const ACCESS_TOKEN_VALIDITY = cdk.Duration.seconds(300);
    const REFRESH_TOKEN_VALIDITY = cdk.Duration.seconds(3600);

    const API_LAMBDA_PREFIX = "../api/cmd";
    const LAMBDA_POST_UPLOADS_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.API}/postUploads/main.go`;
    const LAMBDA_POST_DOWNLOADS_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.API}/postDownloads/main.go`;
    const LAMBDA_GET_DOWNLOAD_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.API}/getDownload/main.go`;
    const LAMBDA_API_AUTHORIZER_LOCATION = `${API_LAMBDA_PREFIX}/${LambdaType.AUTH}/main.go`;

    /**
     * DynamoDB
     */
    const ddbTable = new Table(this, "DdbTable", {
      tableName: props.prefix + "-table",
      billingMode: BillingMode.PROVISIONED,
      partitionKey: {
        name: "PK",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /**
     * Cognito
     */
    const cognito = new CognitoUserPool(this, "CognitoUserPool", {
      region: this.region,
      appPrefix: props.prefix,
    });

    /**
     * S3 Website bucket
     */
    const fileShareServiceWebSiteBucket = new Bucket(
      this,
      "FileShareServiceWebSiteBucket",
      {
        bucketName: `${props.prefix}-spa-bucket`,
        encryption: BucketEncryption.S3_MANAGED,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        publicReadAccess: false,
        versioned: true,
      },
    );

    /**
     * Cloudfront
     */
    const cloudfrontOAI = new OriginAccessIdentity(
      this,
      "OriginAccessIdentity",
      {
        comment: props.prefix + "-oai",
      },
    );
    fileShareServiceWebSiteBucket.grantRead(cloudfrontOAI);

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
      },
    );

    const dummyorigin = new HttpOrigin("will-never-be-reached.org", {
      protocolPolicy: OriginProtocolPolicy.MATCH_VIEWER,
      originSslProtocols: [OriginSslPolicy.SSL_V3],
    });

    // *********************************************************************************************
    // cloudfront edge lambda
    // *********************************************************************************************
    // stackId is necessary to resolve nag finding
    // https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk-lib/aws-cloudfront/lib/experimental/edge-function.ts#L235
    const checkAuthHandlerFn = new experimental.EdgeFunction(
      this,
      "Authentication-Gatway-CheckAuth",
      {
        functionName: `${props.prefix}-edge-chek-auth-handler`,
        runtime: Runtime.NODEJS_LATEST,
        // maximum allowed size for functions that are triggered by a CloudFront event: 128
        memorySize: 128,
        handler: "lambdas/check-auth.handler",
        code: Code.fromAsset(path.join(__dirname, "../../edge/dist")),
        stackId: `${props.prefix}-edge-stack`,
      },
    );

    const parseAuthHandlerFn = new experimental.EdgeFunction(
      this,
      "Authentication-Gatway-ParseAuth",
      {
        functionName: `${props.prefix}-edge-parse-auth-handler`,
        runtime: Runtime.NODEJS_LATEST,
        // maximum allowed size for functions that are triggered by a CloudFront event: 128
        memorySize: 128,
        handler: "lambdas/parse-auth.handler",
        code: Code.fromAsset(path.join(__dirname, "../../edge/dist")),
        stackId: `${props.prefix}-edge-stack`,
      },
    );

    const spaOriginResponseHandlerFn = new experimental.EdgeFunction(
      this,
      "Spa-Custom-Origin-Response",
      {
        functionName: `${props.prefix}-edge-spa-origin-response-handler`,
        runtime: Runtime.NODEJS_LATEST,
        // maximum allowed size for functions that are triggered by a CloudFront event: 128
        memorySize: 128,
        handler: "lambdas/client-side-route.handler",
        code: Code.fromAsset(path.join(__dirname, "../../edge/dist")),
        stackId: `${props.prefix}-edge-stack`,
      },
    );
    fileShareServiceWebSiteBucket.grantRead(spaOriginResponseHandlerFn);

    // *********************************************************************************************
    // Cloudfront function and edge lambdas
    // *********************************************************************************************
    // log for cloudfront function can be accessed in cloudwatch in us-east-1 region
    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-logs.html#
    const checkAuthEdgeLambda: EdgeLambda = {
      eventType: LambdaEdgeEventType.VIEWER_REQUEST,
      functionVersion: checkAuthHandlerFn.currentVersion,
    };

    const errorResponseEdgeLambda: EdgeLambda = {
      // CloudFront does not invoke edge functions for viewer response events, when the origin returns HTTP status code 400 or higher.
      eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
      functionVersion: spaOriginResponseHandlerFn.currentVersion,
    };

    /**
     * Distribution
     */
    const distribution = new Distribution(this, "Distribution", {
      comment: `${props.prefix}-distribution`,
      defaultRootObject: "index.html",
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
        edgeLambdas: [checkAuthEdgeLambda, errorResponseEdgeLambda],
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
      },
    });

    cognito.addClient(
      `${props.prefix}-userPool-app-client`,
      ["http://localhost:3000/signin", `https://${distribution.domainName}` + "/signin"],
      ["http://localhost:3000/", `https://${distribution.domainName}` + "/"],
      {
        idToken: ID_TOKEN_VALIDITY,
        accessToken: ACCESS_TOKEN_VALIDITY,
        refreshToken: REFRESH_TOKEN_VALIDITY,
      },
    );

    const parameterName = `/${props.prefix}/authentication-gateway-config`;    
    const stringifiedCognitoConfig = JSON.stringify({
      userPoolId: cognito.userPool.userPoolId,
      appClientId: cognito.userPoolClient.userPoolClientId,
      appClientSecret: cognito.userPoolClient.userPoolClientSecret.unsafeUnwrap(),
      userPoolDomain: cognito.cognitoDomain,
    });

    new StringParameter(this, 'StringParameter', {
      description: `${props.prefix} application cognito configuration for edge lambda`,
      parameterName: parameterName,
      stringValue: stringifiedCognitoConfig,
    });

    checkAuthHandlerFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter${parameterName}`,
        ],
      }),
    );
    parseAuthHandlerFn.addToRolePolicy(
      new PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter${parameterName}`,
        ],
      }),
    );

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
          allowedOrigins: ["http://localhost:3000", `https://${distribution.domainName}`],
          allowedHeaders: ["*"],
        },
      ],
    });

    /**
     * Authorizer
     */
    const authorizerHandler = new GoLambdaFunction(this, "AuthorizerHandler", {
      name: props.prefix + "-api-authorizer",
      entry: LAMBDA_API_AUTHORIZER_LOCATION,
      environmentVariables: {
        URL_TABLE: ddbTable.tableName,
        FILE_SHARE_BUCKET: fileShareAssetBucket.bucketName,
        JWKS_URL: `https://cognito-idp.${this.region}.amazonaws.com/${cognito.userPool.userPoolId}/.well-known/jwks.json`,
        ISS: `https://cognito-idp.${this.region}.amazonaws.com/${cognito.userPool.userPoolId}`,
        COGNITO_USER_POOL_CLIENT_ID: cognito.userPoolClient.userPoolClientId,
      },
    });
    const lambdaAuthorizer = new HttpLambdaAuthorizer(
      props.prefix + "-cookie-authorizer",
      authorizerHandler.fn,
      {
        responseTypes: [HttpLambdaResponseType.SIMPLE],
        identitySource: ["$request.header.Cookie", "$request.header.cookie"],
      },
    );

    /**
     * HTTP API
     */
    const httpApi = new HttpApi(this, "HttpApi", {
      description: props.prefix + "-http-api",
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
        allowCredentials: true,
      },
      defaultAuthorizer: lambdaAuthorizer,
    });

    // api path
    distribution.addBehavior(
      "/api/*",
      new HttpOrigin(
        `${httpApi.httpApiId}.execute-api.${this.region}.${this.urlSuffix}`,
      ),
      {
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        compress: true,
        edgeLambdas: [checkAuthEdgeLambda],
        cachePolicy: CachePolicy.CACHING_DISABLED,
        // https://stackoverflow.com/questions/71367982/cloudfront-gives-403-when-origin-request-policy-include-all-headers-querystri
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
      },
    );

    distribution.addBehavior("/signin", dummyorigin, {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: CachePolicy.CACHING_DISABLED,
      edgeLambdas: [
        {
          eventType: LambdaEdgeEventType.VIEWER_REQUEST,
          functionVersion: parseAuthHandlerFn.currentVersion,
        },
      ],
      responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
    });

    /**
     * S3 BUCEKT DEPLOYMENT
     */
    new BucketDeployment(this, "BucketDeployment", {
      sources: [Source.asset(`${path.resolve(__dirname)}/../../website/build`)],
      exclude: ["index.html"],
      destinationBucket: fileShareServiceWebSiteBucket,
      // By default, files in the destination bucket that don't exist in the source will be deleted when the BucketDeployment resource is created or updated.
      // You can use the option prune: false to disable this behavior, in which case the files will not be deleted.
      prune: false,
      distribution: distribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
      logRetention: RetentionDays.THREE_MONTHS,
      // https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-s3-deployment.CacheControl.html
      // https://www.keycdn.com/blog/cache-control-immutable
      cacheControl: [
        CacheControl.fromString("max-age=31536000,public,immutable"),
      ],
      memoryLimit: 1024,
    });

    new BucketDeployment(this, "HTMLBucketDeployment", {
      sources: [Source.asset(`${path.resolve(__dirname)}/../../website/build`)],
      exclude: ["*"],
      include: ["index.html"],
      destinationBucket: fileShareServiceWebSiteBucket,
      prune: false,
      distribution: distribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
      logRetention: RetentionDays.THREE_MONTHS,
      cacheControl: [
        CacheControl.fromString("max-age=0,no-cache,no-store,must-revalidate"),
      ],
    });

    new BucketDeployment(this, props.prefix + "BucketDeployment", {
      sources: [Source.asset(`${path.resolve(__dirname)}/../../website/build`)],
      destinationBucket: fileShareServiceWebSiteBucket,
      // By default, files in the destination bucket that don't exist in the source will be deleted when the BucketDeployment resource is created or updated.
      // You can use the option prune: false to disable this behavior, in which case the files will not be deleted.
      prune: false,
      distribution: distribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
    });

    /**
     * API Lambda Function
     */
    const postUploadsHandler = new GoLambdaFunction(
      this,
      "PostUploadsHandler",
      {
        name: props.prefix + "-post-uploads",
        entry: LAMBDA_POST_UPLOADS_LOCATION,
        environmentVariables: {
          URL_TABLE: ddbTable.tableName,
          FILE_SHARE_BUCKET: fileShareAssetBucket.bucketName,
        },
      },
    );
    fileShareAssetBucket.grantPut(postUploadsHandler.fn);
    fileShareAssetBucket.grantPutAcl(postUploadsHandler.fn);

    const postDownloadsHandler = new GoLambdaFunction(
      this,
      "PostDownloadsHandler",
      {
        name: props.prefix + "-post-downloads",
        entry: LAMBDA_POST_DOWNLOADS_LOCATION,
        environmentVariables: {
          URL_TABLE: ddbTable.tableName,
          FILE_SHARE_BUCKET: fileShareAssetBucket.bucketName,
        },
      },
    );
    fileShareAssetBucket.grantRead(postDownloadsHandler.fn);

    const getDownloadHandler = new GoLambdaFunction(
      this,
      "GetDownloadHandler",
      {
        name: props.prefix + "-get-download",
        entry: LAMBDA_GET_DOWNLOAD_LOCATION,
        environmentVariables: {
          URL_TABLE: ddbTable.tableName,
          FILE_SHARE_BUCKET: fileShareAssetBucket.bucketName,
        },
      },
    );
    ddbTable.grantFullAccess(postDownloadsHandler.fn);
    ddbTable.grantFullAccess(getDownloadHandler.fn);

    /**
     * Api Integration
     */
    const apiRouteName = "api";
    httpApi.addRoutes({
      path: `/${apiRouteName}/uploads`,
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        props.prefix + "-post-uploads-integration",
        postUploadsHandler.fn,
        {
          payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
        },
      ),
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/downloads`,
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        props.prefix + "-post-downloads-integration",
        postDownloadsHandler.fn,
        {
          payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
        },
      ),
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/downloads/{key}`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        props.prefix + "-get-download-integration",
        getDownloadHandler.fn,
        {
          payloadFormatVersion: PayloadFormatVersion.VERSION_2_0,
        },
      ),
    });

    new cdk.CfnOutput(this, "FileShareSerivceUrl", {
      value: `https://${distribution.domainName}`,
    });
  }
}
