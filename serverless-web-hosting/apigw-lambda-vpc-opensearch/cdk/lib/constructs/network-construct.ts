import { Construct } from 'constructs';
import { InterfaceVpcEndpointAwsService, IpAddresses, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';

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
          name: `${props.appPrefix}-private-subnet`,
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: `${props.appPrefix}-isolated-subnet`,
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Create VPC endpoints
    // https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html
    this.vpc.addInterfaceEndpoint("ssm-endpoint", {
      service: InterfaceVpcEndpointAwsService.SSM
    });
    this.vpc.addInterfaceEndpoint("ssm-msg-endpoint", {
      service: InterfaceVpcEndpointAwsService.SSM_MESSAGES
    });
    this.vpc.addInterfaceEndpoint("ec2-endpoint", {
      service: InterfaceVpcEndpointAwsService.EC2
    });
    this.vpc.addInterfaceEndpoint("ec2-msg-endpoint", {
      service: InterfaceVpcEndpointAwsService.EC2_MESSAGES
    });
    this.vpc.addGatewayEndpoint("s3-endpoint", {
      service: InterfaceVpcEndpointAwsService.S3
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
