import { Stack, StackProps, aws_imagebuilder } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AmazonLinuxCpuType, AmazonLinuxGeneration, AmazonLinuxImage, CloudFormationInit, Instance, InstanceClass, InstanceSize, InstanceType, IpAddresses, LookupMachineImage, MachineImage, Peer, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { readFileSync } from 'fs';


export class WordpressEc2 extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    /**
     * VPC
     */
    const vpc = new Vpc(this, 'Vpc', {
      vpcName: 'wordpress-vpc',
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
      // By default, one natGateway for each zone
      natGateways: 0,
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: 'wordpress-public-subnet',
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        }
      ],
    });

    const webserverSG = new SecurityGroup(this, 'webserver-sg', {
      vpc,
    });

    webserverSG.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      'allow HTTP traffic from anywhere',
    );

    const ec2Instance = new Instance(this,'ec2Instance', {
      instanceName: 'simple-webserver',
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc: vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
      securityGroup: webserverSG,
    })

    // 👇 load user data script
    const userDataScript = readFileSync('./lib/user-data.sh', 'utf8');
    // 👇 add user data to the EC2 instance
    ec2Instance.addUserData(userDataScript);
  }
}
