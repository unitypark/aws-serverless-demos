import { Construct } from 'constructs';
import { Domain, EngineVersion, TLSSecurityPolicy } from 'aws-cdk-lib/aws-opensearchservice';
import { AnyPrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { EbsDeviceVolumeType, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface OpenSearchProps {
  region: string;
  account: string;
  appPrefix: string;
  vpc: Vpc;
  opensearchSecurityGroup: SecurityGroup;
}

export default class OpenSearchConstruct extends Construct {
  constructor(scope: Construct, id: string, props: OpenSearchProps) {
    super(scope, id);

    const osDomainName = `${props.appPrefix}-domain`;
    this.masterUsername = "admin";
    
    this.osDomain = new Domain(this, 'OsDomain', {
      domainName: osDomainName,
      version: EngineVersion.OPENSEARCH_2_11,
      nodeToNodeEncryption: true,
      // portNumber=443
      enforceHttps: true,
      encryptionAtRest: {
        enabled: true,
      },
      vpc: props.vpc,
      vpcSubnets: [{
          subnets: props.vpc.isolatedSubnets,
      }],
      securityGroups: [props.opensearchSecurityGroup],
      // must be enabled since our VPC contains multiple private subnets.
      zoneAwareness: {
        enabled: true,
        // default: 2
        availabilityZoneCount: 3,
      },
      tlsSecurityPolicy: TLSSecurityPolicy.TLS_1_2,
      fineGrainedAccessControl: {
        masterUserName: this.masterUsername,
      },
      accessPolicies: [
        new PolicyStatement({
          actions: ["es:ESHttp*"],
          resources: [
            `arn:aws:es:${props.region}:${props.account}:domain/${osDomainName}/*`,
          ],
          principals: [new AnyPrincipal()]
        }),
      ],
      capacity: {
        // must be same number like availabilityZoneCount (default: 2)
        dataNodes: 3,
        dataNodeInstanceType: "or1.medium.search",
        multiAzWithStandbyEnabled: false,
      },
      ebs: {
        volumeSize: 20,
        volumeType: EbsDeviceVolumeType.GP3,
      },
      enableVersionUpgrade: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  public readonly masterUsername: string;
  public readonly osDomain: Domain;
}