import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { CfnOutput } from 'aws-cdk-lib';

export class CentralNetworkingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domain = 'url.shortener.app'

    const centralHostedZone = new route53.PublicHostedZone(this, 'HostedZone', {
      zoneName: domain,
      comment: 'central hosted zone for url.shortener.app'
    });

    new ssm.StringParameter(this, 'HostedZoneId', {
      description: 'default qsk route53 hostedzone id',
      parameterName: '/qsk/test-account/r53/hostedzone/id',
      stringValue: centralHostedZone.hostedZoneId,
    });
    new ssm.StringParameter(this, 'HostedZoneName', {
      description: 'default qsk route53 hostedzone name',
      parameterName: '/qsk/test-account/r53/hostedzone/name',
      stringValue: centralHostedZone.zoneName,
    });

    new CfnOutput(this, "CentralNetworkingAccountHostedZoneId", { value: centralHostedZone.hostedZoneId });
    new CfnOutput(this, "CentralNetworkingAccountHostedZoneNameServerList", { value: centralHostedZone.zoneName });
  }
}

