import { Construct } from "constructs";
import {
  AccountRecovery,
  BooleanAttribute,
  OAuthScope,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  VerificationEmailStyle,
} from "aws-cdk-lib/aws-cognito";
import { Duration, RemovalPolicy, SecretValue } from "aws-cdk-lib";

export interface TokenValidityConfig {
  idToken: Duration;
  accessToken: Duration;
  refreshToken: Duration;
}

export interface CognitoUserPoolProps {
  region: string;
  appPrefix: string;
}

export class CognitoUserPool extends Construct {
  public readonly userPool: UserPool;
  public readonly cognitoDomain: string;
  public readonly domainPrefix: string;

  public userPoolClient: UserPoolClient;
  public userPoolClientSecret: SecretValue;

  constructor(scope: Construct, id: string, props: CognitoUserPoolProps) {
    super(scope, id);

    this.domainPrefix = props.appPrefix;
    this.cognitoDomain = `${props.appPrefix}.auth.${props.region}.amazoncognito.com`;

    this.userPool = new UserPool(this, "UserPool", {
      userPoolName: this.domainPrefix + "-userPool",
      signInAliases: {
        email: true,
      },
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
      },
      userVerification: {
        emailSubject: "[AWS Cloud FileShare] - Verification Code",
        emailBody: "Verification Code: {####}",
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
        domainPrefix: this.domainPrefix,
      },
    });
  }

  addClient(
    id: string,
    callbackUrls: string[],
    signoutUrls: string[],
    tokenValidityConfig: TokenValidityConfig,
  ) {
    this.userPoolClient = this.userPool.addClient(id, {
      userPoolClientName: this.domainPrefix + "-app-client",
      generateSecret: true,
      authFlows: {
        userPassword: true,
      },
      disableOAuth: false,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
          clientCredentials: false,
        },
        callbackUrls: callbackUrls,
        logoutUrls: signoutUrls,
        scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE],
      },
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
      accessTokenValidity: tokenValidityConfig.idToken,
      idTokenValidity: tokenValidityConfig.accessToken,
      refreshTokenValidity: tokenValidityConfig.refreshToken,
      preventUserExistenceErrors: true,
    });
    this.userPoolClientSecret = this.userPoolClient.userPoolClientSecret;
  }
}
