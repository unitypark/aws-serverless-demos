import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AllowedMethods, CachePolicy, Distribution, OriginAccessIdentity, ResponseHeadersPolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import path = require('path');
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, IHostedZone, PublicHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

interface Props extends cdk.StackProps {
  appPrefix: string
  publicDomainName?: string
  landingZoneHostedZone?: IHostedZone
  certificate?: Certificate
}

export class LandingZoneStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    /**
     * S3 Website bucket 
     */
    const landingZoneWebSiteBucket = new Bucket(this, props.appPrefix + '-landing-zone-website-bucket', {
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
    const cloudfrontOAI = new OriginAccessIdentity(this, props.appPrefix + '-oai', {
      comment: props.appPrefix + '-oai',
    });
    landingZoneWebSiteBucket.grantRead(cloudfrontOAI);

    
    const distributionLoggingPrefix = "distribution-access-logs/";
    const distributionLoggingBucket = new Bucket(
      this,
      `${props.appPrefix}-distribution-access-logging-bucket`,
      {
        objectOwnership: ObjectOwnership.OBJECT_WRITER,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        publicReadAccess: false,
        versioned: true,
        lifecycleRules: [
          {
            prefix: distributionLoggingPrefix,
            abortIncompleteMultipartUploadAfter: Duration.days(90),
            expiration: Duration.days(90),
          },
        ],
      }
    );

    /**
     * Distribution
     */    
    const distribution = new Distribution(
      this,
      `${props.appPrefix}-distribution`,
      {
        comment: `${props.appPrefix}-landing-zone-distribution`,
        certificate: props.certificate,
        domainNames: props.publicDomainName === undefined ? [] : [props.publicDomainName],
        defaultRootObject: "index.html",
        logBucket: distributionLoggingBucket,
        logFilePrefix: distributionLoggingPrefix,
        logIncludesCookies: true,
        defaultBehavior: {
          origin: new S3Origin(landingZoneWebSiteBucket, {
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

    const DISTRIBUTION_LANDING_ZONE_URL = props.publicDomainName === undefined ? `https://${distribution.distributionDomainName}` : `https://${props.publicDomainName}`

    if (props.publicDomainName !== undefined && props.landingZoneHostedZone !== undefined) {
      new ARecord(this, 'distribution-ARecord', {
        recordName: props.publicDomainName,
        zone: props.landingZoneHostedZone,
        target: RecordTarget.fromAlias(
          new CloudFrontTarget(distribution)
        ),
      });
    }

    new BucketDeployment(this, props.appPrefix + '-deploy-landingzone-website-asset', {
      sources: [
        Source.asset(`${path.resolve(__dirname)}/../../website/landingzone/build`),
      ],
      destinationBucket: landingZoneWebSiteBucket,
      // By default, files in the destination bucket that don't exist in the source will be deleted when the BucketDeployment resource is created or updated.
      // You can use the option prune: false to disable this behavior, in which case the files will not be deleted.
      prune: false,
      distribution: distribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
    });
    
    new cdk.CfnOutput(this, 'CloudfrontLandingZoneDistributionDomain', { value: DISTRIBUTION_LANDING_ZONE_URL});
  }
}