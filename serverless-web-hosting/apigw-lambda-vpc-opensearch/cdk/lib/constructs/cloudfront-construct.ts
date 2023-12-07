import { Construct } from 'constructs';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { AllowedMethods, CachePolicy, CfnDistribution, Distribution, ErrorResponse, OriginAccessIdentity, OriginRequestPolicy, ResponseHeadersPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { RestApiOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';

enum HttpStatus {
    OK = 200,
    Unauthorized = 403,
    NotFound = 404
  }
export interface CloudfrontProps {
    appPrefix: string;
}

export default class CloudfrontConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CloudfrontProps) {
    super(scope, id);

    /**
     * S3 Website bucket 
     */
    this.webSiteBucket = new Bucket(this, props.appPrefix + '-website-bucket', {
        encryption: BucketEncryption.S3_MANAGED,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        publicReadAccess: false,
        versioned: true,
    });

    /**
     * Cloudfront 
     */
    const cloudfrontOAI = new OriginAccessIdentity(this, props.appPrefix + '-oai', {
        comment: props.appPrefix + '-oai',
      });
    this.webSiteBucket.grantRead(cloudfrontOAI);

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

    /**
     * Distribution
     */    
    this.distribution = new Distribution(this, `${props.appPrefix}-distribution`, {
        comment: `${props.appPrefix}-landing-zone-distribution`,
        defaultRootObject: "index.html",
        errorResponses: [errorResponse403, errorResponse404],
        defaultBehavior: {
        origin: new S3Origin(this.webSiteBucket, {
            originAccessIdentity: cloudfrontOAI,
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
        },
    });
}

    public readonly webSiteBucket: Bucket
    public readonly distribution: Distribution
}
