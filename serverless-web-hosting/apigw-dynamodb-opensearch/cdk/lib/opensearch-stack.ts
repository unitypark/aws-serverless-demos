import { Construct } from 'constructs';
import DomainConstruct from './constructs/domain-construct';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import OpenSearchConstruct from './constructs/opensearch-construct';
import NetworkConstruct from './constructs/network-construct';
import BastionConstruct from './constructs/bastion-construct';

interface Props extends StackProps {
  prefix: string
  baseDomain: string
  subDomain: string
}

export class OpenSearchStack extends Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const osDomainName = `${props.prefix}`;

    const domain = new DomainConstruct(this, "DomainConstruct", {
      baseDomain: props.baseDomain,
      subDomain: props.subDomain,
    });

    const network = new NetworkConstruct(this, "NetworkConstruct", {
      appPrefix: props.prefix,
    });

    new BastionConstruct(this, "BastionConstruct", {
      appPrefix: props.prefix,
      vpc: network.vpc,
      bastionSecurityGroup: network.bastionSecurityGroup,
    });

    const dashboradDomain = `dashboard.${domain.serviceDomain}`
    const opensearch = new OpenSearchConstruct(this, "OpenSearchConstruct", {
      region: this.region,
      account: this.account,
      appPrefix: props.prefix,
      osDomainName: osDomainName,
      dashboardDomain: dashboradDomain,
      serviceHostedZone: domain.serviceHostedZone,
      vpc: network.vpc,
      opensearchSecurityGroup: network.opensearchSecurityGroup,
    });

    new CfnOutput(this, 'OpenSearchDashboardCustomDomain', {
      value: `https://${dashboradDomain}`
    });

    new CfnOutput(this, 'OpenSearchMasterUserPassword', {
      value: opensearch.osDomain.masterUserPassword ? opensearch.osDomain.masterUserPassword.unsafeUnwrap() : "undefined"
    });
  }
}
