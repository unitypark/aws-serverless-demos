import { Construct } from 'constructs';
import { AccountRecovery, BooleanAttribute, CfnIdentityPool, CfnIdentityPoolRoleAttachment, CfnUserPoolGroup, OAuthScope, ResourceServerScope, UserPool, UserPoolClient, UserPoolClientIdentityProvider, UserPoolResourceServer, VerificationEmailStyle } from 'aws-cdk-lib/aws-cognito';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Effect, FederatedPrincipal, ManagedPolicy, PolicyDocument, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';

export interface CognitoUserPoolProps {
    region: string;
    account: string;
    appPrefix: string;
    suffix: string;
    osDomainName: string;
}

export class CognitoConstruct extends Construct {
    constructor(scope: Construct, id: string, props: CognitoUserPoolProps) {
    super(scope, id);

    this.userPool = new UserPool(this, "UserPool", {
        userPoolName: props.appPrefix + '-user-pool',
        signInAliases: {
          email: true,
        },
        selfSignUpEnabled: true,
        autoVerify: {
          email: true,
        },
        userVerification: {
          emailSubject: '[AWS OpenSearch Demo] - Verification Code',
          emailBody: 'Verification Code: {####}',
          emailStyle: VerificationEmailStyle.CODE,
        },
        customAttributes: {
          isAdmin: new BooleanAttribute({
            mutable: true,
          }),
        },
        passwordPolicy: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireDigits: true,
          requireSymbols: true,
        },
        accountRecovery: AccountRecovery.EMAIL_ONLY,
        removalPolicy: RemovalPolicy.DESTROY,
    });
    this.userPool.addDomain("UserpoolDomain", {
        cognitoDomain: {
          domainPrefix: `${props.appPrefix}-${props.suffix}`,
        },
    });
    
    // the identity pool grants the client temporary creds using the role. This lets them retrieve objects from S3
    this.identityPool = new CfnIdentityPool(this, "CfnIdentityPool", {
        identityPoolName: `${props.appPrefix}-identity-pool`,
        allowUnauthenticatedIdentities: false,
      }
    );

    const osHttpPolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          resources: ["*"],
          actions: ["es:ESHttp*"],
        }),
      ],
    });

    this.osAdminUserRole = new Role(this, "AuthRole",
      {
        roleName: `${props.appPrefix}-cognito-auth-role`,
        inlinePolicies: {
          OpenSearchHttpPolicy: osHttpPolicy,
        },
        assumedBy: new FederatedPrincipal(
          "cognito-identity.amazonaws.com",
          {
            StringEquals: {
              "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
            },
            "ForAnyValue:StringLike": {
              "cognito-identity.amazonaws.com:amr": "authenticated",
            },
          },
          "sts:AssumeRoleWithWebIdentity"
        ),
      }
    );

    new CfnIdentityPoolRoleAttachment(this, "PoolRoleMapping", {
      identityPoolId: this.identityPool.ref,
      roles: { authenticated: this.osAdminUserRole.roleArn },
    });

    new CfnUserPoolGroup(this, "UserPoolAdminGroupPool", {
      userPoolId: this.userPool.userPoolId,
      groupName: "os-admins",
      roleArn: this.osAdminUserRole.roleArn
    });
  }

  public readonly userPool: UserPool;
  public readonly identityPool: CfnIdentityPool;
  public readonly osAdminUserRole: Role;
}