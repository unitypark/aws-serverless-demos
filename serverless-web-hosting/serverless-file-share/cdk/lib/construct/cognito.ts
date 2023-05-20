import { Construct } from 'constructs';
import { OAuthScope, StringAttribute, UserPool, UserPoolClient, UserPoolClientIdentityProvider } from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface CognitoUserPoolProps {
    region: string;
    appPrefix: string;
}

export class CognitoUserPool extends Construct {
    public readonly userPool: UserPool;
    public readonly cognitoDomain: string;
    public readonly domainPrefix: string;

    public userPoolClient: UserPoolClient;

    constructor(scope: Construct, id: string, props: CognitoUserPoolProps) {
    super(scope, id);
    
    this.domainPrefix = props.appPrefix
    this.cognitoDomain = `${props.appPrefix}.auth.${props.region}.amazoncognito.com`

    this.userPool = new UserPool(this, this.domainPrefix + '-user-pool', {
        userPoolName: this.domainPrefix + '-userPool',
        customAttributes: {
          role: new StringAttribute({ minLen: 1, maxLen: 10, mutable: true }),
        },
        removalPolicy: RemovalPolicy.DESTROY,
    });
    this.userPool.addDomain("UserpoolDomain", {
        cognitoDomain: {
          domainPrefix: this.domainPrefix,
        },
    });
  }

  addClient(id: string, callbackUrls: string[]) {
    this.userPoolClient = this.userPool.addClient(id, {
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
          scopes: [ OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE ],
        },
        supportedIdentityProviders: [
          UserPoolClientIdentityProvider.COGNITO
        ],
      }
    );
  }
}
