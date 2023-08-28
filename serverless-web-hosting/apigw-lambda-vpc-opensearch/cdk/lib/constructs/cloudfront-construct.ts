import { Construct } from 'constructs';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { AllowedMethods, CachePolicy, Distribution, OriginAccessIdentity, ResponseHeadersPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';

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

    /**
     * Distribution
     */    
   this.distribution = new Distribution(this, `${props.appPrefix}-distribution`,
        {
            comment: `${props.appPrefix}-landing-zone-distribution`,
            defaultRootObject: "index.html",
            logIncludesCookies: true,
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
        }
    );
  }

  public readonly webSiteBucket: Bucket
  public readonly distribution: Distribution
}
