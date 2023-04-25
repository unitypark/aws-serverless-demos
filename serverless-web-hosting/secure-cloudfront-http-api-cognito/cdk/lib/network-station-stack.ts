import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import { AllowedMethods, CacheCookieBehavior, CachePolicy, CacheQueryStringBehavior, CachedMethods, CfnDistribution, CloudFrontAllowedCachedMethods, CloudFrontAllowedMethods, CloudFrontWebDistribution, Distribution, EdgeLambda, ErrorResponse, FunctionEventType, KeyGroup, LambdaEdgeEventType, OriginAccessIdentity, OriginRequestCookieBehavior, OriginRequestHeaderBehavior, OriginRequestPolicy, OriginRequestQueryStringBehavior, PublicKey, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
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
import { CustomResource, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { HttpOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';

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

export class NetworkStationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const LAMBDA_PREFIX = '../lambda/cmd'
    const LAMBDA_GET_NETWORK_STATIONS_LOCATION = `${LAMBDA_PREFIX}/${LambdaType.API}/getNetworkStations/main.go`
    const LAMBDA_GET_FASTEST_NEWORK_STATION_LOCATION = `${LAMBDA_PREFIX}/${LambdaType.API}/getFastestNetworkStation/main.go`
    const LAMBDA_API_AUTHORIZER_LOCATION = `${LAMBDA_PREFIX}/${LambdaType.AUTH}/main.go`

    const CUSTOM_RESOURCE_LAMBDA_PREFIX = '../customresource/cmd'
    const LAMBDA_INIT_DB_LOCATION = `${CUSTOM_RESOURCE_LAMBDA_PREFIX}/initDb/main.go`

    /**
     * DynamoDB
     */
    const ddbTable = new ddb.Table(this, props.appPrefix + '-ddb-table', {
      tableName: props.appPrefix + '-table',
      billingMode: ddb.BillingMode.PROVISIONED,
      partitionKey: {
          name: 'ID',
          type: ddb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /**
     * CUSTOM RESOURCE ONEVENT HANDLER
     */
    const onEventLambda = new GoLambdaFunction(this, props.appPrefix + '-init-db', {
      name: props.appPrefix + '-init-db',
      entry: LAMBDA_INIT_DB_LOCATION,
    })
    ddbTable.grantWriteData(onEventLambda.fn);
    onEventLambda.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["logs:CreateLogGroup"],
        resources: ["*"],
        effect: iam.Effect.DENY,
      })
    );
    new CustomResource(this, "custom-resource", {
      resourceType: "Custom::InitDynamoDBSeedData",
      serviceToken: onEventLambda.fn.functionArn,
      removalPolicy: RemovalPolicy.DESTROY,
      properties: {
        dynamoDbTableName: ddbTable.tableName,
      },
    });

    /**
     * Cognito
     */
    const cognito = new CognitoUserPool(this, props.appPrefix + '-cognito-userPool', {
      region: this.region,
      appPrefix: props.appPrefix,
    });
    const cognitoDefaultRoleUser = new CognitoUser(this, props.appPrefix + '-cognito-default-user', {
      username: 'client',
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

    const errorResponse403: ErrorResponse = {
      httpStatus: HttpStatus.Unauthorized,
      responseHttpStatus: HttpStatus.OK,
      responsePagePath: '/index.html',
      ttl: Duration.seconds(0),
    };
    const errorResponse404: ErrorResponse = {
      httpStatus: HttpStatus.NotFound,
      responseHttpStatus: HttpStatus.OK,
      responsePagePath: '/index.html',
      ttl: Duration.seconds(0),
    };

    const edgeLambda: EdgeLambda = {
      eventType: LambdaEdgeEventType.VIEWER_REQUEST,
      functionVersion: authLambda.fn,
    };

    const webOriginCachePolicy = new CachePolicy(this, 'webOriginCachePolicy', {
      cachePolicyName: 'web-origin-cache-policy',
      comment: 'web origin cache policy in distritbution',
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      cookieBehavior: CacheCookieBehavior.all(),
      queryStringBehavior: CacheQueryStringBehavior.all(),
    })

    const apiOriginCachePolicy = new CachePolicy(this, 'apiOriginCachePolicy', {
      cachePolicyName: 'api-origin-cache-policy',
      comment: 'api origin cache policy in distritbution',
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
      cookieBehavior: CacheCookieBehavior.all(),
      queryStringBehavior: CacheQueryStringBehavior.all(),
    })

    /**
     * Distribution for Admin Origin
     */
    const distribution = new Distribution(this, 'distro', {
      comment: props.appPrefix + '-distribution',
      defaultRootObject: 'index.html',
      errorResponses: [errorResponse403, errorResponse404],
      defaultBehavior: {
        origin: new S3Origin(webSiteBucket, {
          originAccessIdentity: cloudfrontOAI
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
        edgeLambdas: [edgeLambda],
        cachePolicy: webOriginCachePolicy,
      },
      additionalBehaviors: {
        "api/*": {
          origin: new HttpOrigin(`${httpApi.httpApiId}.execute-api.${this.region}.${this.urlSuffix}`),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          compress: true,
          cachedMethods: CachedMethods.CACHE_GET_HEAD,
          cachePolicy: apiOriginCachePolicy,
        },
      },
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
      prune: false,
      distribution: distribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
    }); 

    /** 
     * API Lambda Function
    */   
    const getNetworkStationsHandler = new GoLambdaFunction(this, props.appPrefix + '-get-network-stations', {
      name: props.appPrefix + '-get-network-stations',
      entry: LAMBDA_GET_NETWORK_STATIONS_LOCATION,
      environmentVariables: {
        'NETWORK_STATION_TABLE': ddbTable.tableName,
        'ORIGIN': distributionUrl,
      }
    })
    const getFastestNetworkStationHandler = new GoLambdaFunction(this, props.appPrefix + '-get-fastest-network-station', {
      name: props.appPrefix + '-get-fastest-network-station',
      entry: LAMBDA_GET_FASTEST_NEWORK_STATION_LOCATION,
      environmentVariables: {
        'NETWORK_STATION_TABLE': ddbTable.tableName,
        'ORIGIN': distributionUrl,
      }
    })
    ddbTable.grantFullAccess(getNetworkStationsHandler.fn);
    ddbTable.grantFullAccess(getFastestNetworkStationHandler.fn);

    /**
     * Authorizer
     */
    const authHandler = new GoLambdaFunction(this, props.appPrefix + '-api-authorizer', {
      name: props.appPrefix + '-api-authorizer',
      entry: LAMBDA_API_AUTHORIZER_LOCATION,
      environmentVariables: {
        'JWKS_URL': `https://cognito-idp.${this.region}.amazonaws.com/${cognito.userPool.userPoolId}/.well-known/jwks.json`,
        'ISS': `https://cognito-idp.${this.region}.amazonaws.com/${cognito.userPool.userPoolId}`,
        'COGNITO_USER_POOL_CLIENT_ID': cognito.userPoolClient.userPoolClientId,
        'ADMIN_ROLE_NAME': UserRole.ADMIN
      }
    });
    
    const cookieAuthorizer = new HttpLambdaAuthorizer(props.appPrefix + '-cookie-authorizer', authHandler.fn, {
      responseTypes: [HttpLambdaResponseType.SIMPLE],
      identitySource: ["$request.header.Cookie"],
      resultsCacheTtl: Duration.seconds(0),
    });

    /**
     * Api Integration
     */
    const apiRouteName = 'api'
    httpApi.addRoutes({
      path: `/${apiRouteName}/stations`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('get-network-stations-integration', getNetworkStationsHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: cookieAuthorizer,
    });

    httpApi.addRoutes({
      path: `/${apiRouteName}/stations/fastest`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('get-network-station-speed-integration', getFastestNetworkStationHandler.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
      authorizer: cookieAuthorizer,
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
    
    new cdk.CfnOutput(this, 'CloudfrontAdminDistributionDomain', { value: distributionUrl });
    new cdk.CfnOutput(this, 'ClientUsername', { value: cognitoDefaultRoleUser.username });
    new cdk.CfnOutput(this, 'ClientPassword', { value: cognitoDefaultRoleUser.password });
  }
}
