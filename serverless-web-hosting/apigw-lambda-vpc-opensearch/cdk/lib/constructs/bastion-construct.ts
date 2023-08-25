import { Construct } from 'constructs';
import { BastionHostLinux, BlockDeviceVolume, MachineImage, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';

export interface BastionProps {
    appPrefix: string;
    vpc: Vpc;
    bastionSecurityGroup: SecurityGroup;
}

export default class BastionConstruct extends Construct {
  constructor(scope: Construct, id: string, props: BastionProps) {
    super(scope, id);

    // Bastion host to access Opensearch Dashboards
    new BastionHostLinux(this, "BastionHost", {
      instanceName: `${props.appPrefix}-bastion`,
      vpc: props.vpc,
      securityGroup: props.bastionSecurityGroup,
      machineImage: MachineImage.latestAmazonLinux2023(),
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: BlockDeviceVolume.ebs(10, {
          encrypted: true,
          }),
        },
      ],
    });
  }
}
