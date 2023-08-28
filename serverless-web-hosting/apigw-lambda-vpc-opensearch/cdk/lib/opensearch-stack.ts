import { Construct } from 'constructs';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import OpenSearchConstruct from './constructs/opensearch-construct';
import NetworkConstruct from './constructs/network-construct';
import BastionConstruct from './constructs/bastion-construct';
import RestApiConstruct from './constructs/rest-api-construct';
import CloudfrontConstruct from './constructs/cloudfront-construct';

interface Props extends StackProps {
  prefix: string
}

export class OpenSearchStack extends Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const network = new NetworkConstruct(this, "NetworkConstruct", {
      appPrefix: props.prefix,
    });

    new BastionConstruct(this, "BastionConstruct", {
      appPrefix: props.prefix,
      vpc: network.vpc,
      bastionSecurityGroup: network.bastionSecurityGroup,
    });

    const opensearch = new OpenSearchConstruct(this, "OpenSearchConstruct", {
      region: this.region,
      account: this.account,
      appPrefix: props.prefix,
      vpc: network.vpc,
      opensearchSecurityGroup: network.opensearchSecurityGroup,
    });

    const apiStageName = 'dev'
    const api = new RestApiConstruct(this, "RestApiConstruct", {
      appPrefix: props.prefix,
      stageName: apiStageName,
      vpc: network.vpc,
      masterUsername: opensearch.masterUsername,
      osDomain: opensearch.osDomain,
    });

    const cloudfront = new CloudfrontConstruct(this, "CloudfrontConstruct", {
      appPrefix: props.prefix
    })

    new CfnOutput(this, 'OpenSearchDashboardDomainEndpoint', {
      value: `${opensearch.osDomain.domainEndpoint}`
    });

    new CfnOutput(this, 'RestApiEndpoint', {
      value: `https://${api.api.restApiId}.execute-api.${this.region}.amazonaws.com/${apiStageName}`
    });

    new CfnOutput(this, 'WebsiteBucketName', {
      value: `${cloudfront.webSiteBucket.bucketName}`
    });

    new CfnOutput(this, 'DistributionId', {
      value: `${cloudfront.distribution.distributionId}`
    });

    new CfnOutput(this, 'DistributionDomain', {
      value: `https://${cloudfront.distribution.distributionDomainName}`
    });
  }
}
