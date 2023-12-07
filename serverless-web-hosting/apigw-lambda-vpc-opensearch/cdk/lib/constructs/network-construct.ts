import { Construct } from 'constructs';
import { IpAddresses, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';

export interface OpenSearchProps {
  appPrefix: string;
}

export default class NetworkConstruct extends Construct {
  constructor(scope: Construct, id: string, props: OpenSearchProps) {
    super(scope, id);

    // VPC
    this.vpc = new Vpc(this, "OpensearchVpc", {
      vpcName: `${props.appPrefix}-vpc`,
      natGateways: 0,  
      ipAddresses: IpAddresses.cidr('10.0.0.0/18'),
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: `${props.appPrefix}-isolated-subnet`,
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Security Group
    this.bastionSecurityGroup = new SecurityGroup(
      this,
      "BastionSecurityGroup",
      {
        vpc: this.vpc,
        allowAllOutbound: true,
        securityGroupName: `${props.appPrefix}-bastion-sg`,
      }
    );

    // Security Group
    this.opensearchSecurityGroup = new SecurityGroup(
      this,
      "OpensearchSecurityGroup",
      {
        vpc: this.vpc,
        securityGroupName: `${props.appPrefix}-sg`,
      }
    );
    this.opensearchSecurityGroup.addIngressRule(this.bastionSecurityGroup, Port.tcp(443));
  }

  public readonly vpc: Vpc;
  public readonly bastionSecurityGroup: SecurityGroup;
  public readonly opensearchSecurityGroup: SecurityGroup;
}
