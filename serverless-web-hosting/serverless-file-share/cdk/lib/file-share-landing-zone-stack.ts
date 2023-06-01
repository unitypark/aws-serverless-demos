import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import { AllowedMethods, CacheCookieBehavior, CachePolicy, CacheQueryStringBehavior, Distribution, ErrorResponse, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import path = require('path');
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, PublicHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';

interface Props extends cdk.StackProps {
  appPrefix: string
  edgeRegion: string
  publicDomainName: string
  certificate: Certificate
}

export class FileShareServiceLandingZoneStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    /**
     * S3 Website bucket 
     */
    const landingZoneWebSiteBucket = new s3.Bucket(this, props.appPrefix + '-landing-zone-website-bucket', {
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
    landingZoneWebSiteBucket.grantRead(cloudfrontOAI);

    /**
     * Distribution
     */    
    const distribution = new Distribution(
      this,
      `${props.appPrefix}-distribution`,
      {
        comment: `${props.appPrefix}-landing-zone-distribution`,
        certificate: props.certificate,
        domainNames: [props.publicDomainName],
        defaultRootObject: "index.html",
        defaultBehavior: {
          origin: new S3Origin(landingZoneWebSiteBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          compress: true,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        },
      }
    );
    
    const hostedZone = PublicHostedZone.fromLookup(this, "PublicHostedZoneImport", { 
      domainName: props.publicDomainName 
    });

    new ARecord(this, 'distribution-ARecord', {
      recordName: props.publicDomainName,
      zone: hostedZone,
      target: RecordTarget.fromAlias(
        new CloudFrontTarget(distribution)
      ),
    });

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
    
    new cdk.CfnOutput(this, 'LandingZoneUrl', { value: `https://${props.publicDomainName}`});
  }
}
