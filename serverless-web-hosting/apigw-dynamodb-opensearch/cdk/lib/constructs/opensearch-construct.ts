import { Construct } from 'constructs';
import { Domain, EngineVersion, TLSSecurityPolicy } from 'aws-cdk-lib/aws-opensearchservice';
import { AnyPrincipal, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { EbsDeviceVolumeType, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
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
  userPoolId: string;
  identityPoolId: string;
  osAdminUserRoleArn: string;
}

export default class OpenSearchConstruct extends Construct {
  constructor(scope: Construct, id: string, props: OpenSearchProps) {
    super(scope, id);

    // OpenSearch service needs access to Cognito to create and configure an app client in the user pool and identity in the identity pool.
    const cognitoOpensearchRole = new Role(this, 'LinkedRoleCognitoAccessForAmazonOpenSearch', {
      roleName: 'LinkedRoleCognitoAccessForAmazonOpenSearch',
      assumedBy: new ServicePrincipal('opensearchservice.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonOpenSearchServiceCognitoAccess')],
    });

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
/*       cognitoDashboardsAuth: {
        identityPoolId: props.identityPoolId,
        role: cognitoOpensearchRole,
        userPoolId: props.userPoolId,
      }, */
      accessPolicies: [
        new PolicyStatement({
          actions: ["es:ESHttp*"], //Subset of actions?
          resources: [`arn:aws:es:${props.region}:${props.account}:domain/${props.osDomainName}/*`],
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

    this.osDomain.addAccessPolicies(
      new PolicyStatement({
        principals: [new AnyPrincipal()],
        actions: ["es:ESHttp*"],
        resources: [
          this.osDomain.domainArn + "/*",
          props.dashboardDomain + "/*",
        ],
      })
    );
  }

  public readonly osDomain: Domain
}