import { Construct } from "constructs";
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class BaseVpc extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'vpc', {
        ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
        // By default, one natGateway for each zone
        natGateways: 1,
        maxAzs: 2,
        subnetConfiguration: [
          {
            name: 'public-subnet',
            subnetType: ec2.SubnetType.PUBLIC,
            cidrMask: 24,
          },
          {
            name: 'private-subnet',
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            cidrMask: 24,
          },
        ],
    });
  }
}
