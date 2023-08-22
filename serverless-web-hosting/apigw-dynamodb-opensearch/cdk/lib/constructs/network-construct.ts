import { Construct } from 'constructs';
import { Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';

export interface OpenSearchProps {
  appPrefix: string;
}

export default class NetworkConstruct extends Construct {
  constructor(scope: Construct, id: string, props: OpenSearchProps) {
    super(scope, id);

    // VPC
    this.vpc = new Vpc(this, "OpensearchVpc", {
      vpcName: `${props.appPrefix}-vpc`,  
    });

    // Security Group
    this.bastionSecurityGroup = new SecurityGroup(
      this,
      "BastionSecurityGroup",
      {
        vpc: this.vpc,
        allowAllOutbound: true,
        securityGroupName: `${props.appPrefix}-os-bastion-sg`,
      }
    );

    // Security Group
    this.opensearchSecurityGroup = new SecurityGroup(
      this,
      "OpensearchSecurityGroup",
      {
        vpc: this.vpc,
        securityGroupName: `${props.appPrefix}-os-sg`,
      }
    );
    this.opensearchSecurityGroup.addIngressRule(this.bastionSecurityGroup, Port.tcp(443));
  }

  public readonly vpc: Vpc;
  public readonly bastionSecurityGroup: SecurityGroup;
  public readonly opensearchSecurityGroup: SecurityGroup;
}
