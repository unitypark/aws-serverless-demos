import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import OpenSearchConstruct from './constructs/opensearch-construct';
import NetworkConstruct from './constructs/network-construct';
import BastionConstruct from './constructs/bastion-construct';
import HTTPApiConstruct from './constructs/http-api-construct';
import CloudfrontConstruct from './constructs/cloudfront-construct';
import { Construct } from 'constructs';

interface Props extends StackProps {
  prefix: string;
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

    const cloudfront = new CloudfrontConstruct(this, "CloudfrontConstruct", {
      appPrefix: props.prefix,
    })

    const apiRoute = '/api'
    const restApi = new HTTPApiConstruct(this, "RestApiConstruct", {
      appPrefix: props.prefix,
      apiRoute: apiRoute,
      vpc: network.vpc,
      masterUsername: opensearch.masterUsername,
      osDomain: opensearch.osDomain,
      cloudfrontDomain: `https://${cloudfront.distribution.distributionDomainName}`
    });

    new CfnOutput(this, 'OpenSearchDashboardDomainEndpoint', {
      value: `${opensearch.osDomain.domainEndpoint}`
    });

    new CfnOutput(this, 'HTTPApiEndpoint', {
      value: `${restApi.api.apiEndpoint}${apiRoute}`
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
