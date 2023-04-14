import { Construct } from 'constructs';
import { OAuthScope, UserPool, UserPoolClient, UserPoolClientIdentityProvider } from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface CognitoUserPoolProps {
    region: string;
    appPrefix: string;
}

export class CognitoUserPool extends Construct {
    public readonly userPool: UserPool;
    public readonly userPoolClient: UserPoolClient;
    public readonly cognitoDomain: string;
    public readonly domainPrefix: string;

    constructor(scope: Construct, id: string, props: CognitoUserPoolProps) {
    super(scope, id);
    
    this.domainPrefix = props.appPrefix
    this.cognitoDomain = `${props.appPrefix}.auth.${props.region}.amazoncognito.com`

    this.userPool = new UserPool(this, "UserPool", {
        userPoolName: this.domainPrefix + '-userPool',
        removalPolicy: RemovalPolicy.DESTROY,
    });
    this.userPool.addDomain("UserpoolDomain", {
        cognitoDomain: {
          domainPrefix: this.domainPrefix,
        },
    });
  }

  addClient(id: string, callbackUrls: string[]): UserPoolClient {
    return this.userPool.addClient(id, {
        userPoolClientName: this.domainPrefix + "-app-client",
        authFlows: {
          adminUserPassword: false,
          custom: true,
          userPassword: true,
          userSrp: true,
        },
        disableOAuth: false,
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
            implicitCodeGrant: false,
            clientCredentials: false,
          },
          callbackUrls: callbackUrls,
          scopes: [OAuthScope.EMAIL, OAuthScope.OPENID],
        },
        supportedIdentityProviders: [
          UserPoolClientIdentityProvider.COGNITO
        ],
      });
  }
}
