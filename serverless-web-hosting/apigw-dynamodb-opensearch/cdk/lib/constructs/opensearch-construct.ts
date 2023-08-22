import { Construct } from 'constructs';
import { Domain, EngineVersion, TLSSecurityPolicy } from 'aws-cdk-lib/aws-opensearchservice';
import { AnyPrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { EbsDeviceVolumeType, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';

export interface OpenSearchProps {
  region: string;
  account: string;
  appPrefix: string;
  osDomainName: string;
  dashboardDomain: string;
  serviceHostedZone: IHostedZone;
  vpc: Vpc;
  opensearchSecurityGroup: SecurityGroup;
}

export default class OpenSearchConstruct extends Construct {
  constructor(scope: Construct, id: string, props: OpenSearchProps) {
    super(scope, id);

    this.osDomain = new Domain(this, 'OsDomain', {
      domainName: props.osDomainName,
      version: EngineVersion.OPENSEARCH_2_7,
      nodeToNodeEncryption: true,
      enforceHttps: true,
      encryptionAtRest: {
        enabled: true,
      },
      vpc: props.vpc,
      securityGroups: [props.opensearchSecurityGroup],
      // must be enabled since our VPC contains multiple private subnets.
      zoneAwareness: {
        enabled: true,
        // default: 2
        availabilityZoneCount: 3,
      },
      tlsSecurityPolicy: TLSSecurityPolicy.TLS_1_2,
      fineGrainedAccessControl: {
        masterUserName: 'admin',
      },
      accessPolicies: [
        new PolicyStatement({
          actions: ["es:ESHttp*"],
          resources: [
            `arn:aws:es:${props.region}:${props.account}:domain/${props.osDomainName}/*`,
            props.dashboardDomain + "/*",
          ],
          principals: [new AnyPrincipal()]
        }),
      ],
      capacity: {
        // must be same number like availabilityZoneCount (default: 2)
        dataNodes: 3,
        dataNodeInstanceType: "t3.small.search",
        multiAzWithStandbyEnabled: false,
      },
      ebs: {
        volumeSize: 10,
        volumeType: EbsDeviceVolumeType.GP2,
      },
      customEndpoint: {
        domainName: props.dashboardDomain,
        hostedZone: props.serviceHostedZone,
      },
      enableVersionUpgrade: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  public readonly osDomain: Domain
}