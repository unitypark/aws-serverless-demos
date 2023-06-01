import { Construct } from 'constructs';
import { AccountRecovery, BooleanAttribute, OAuthScope, UserPool, UserPoolClient, UserPoolClientIdentityProvider, VerificationEmailStyle } from 'aws-cdk-lib/aws-cognito';
import { Duration, RemovalPolicy, SecretValue } from 'aws-cdk-lib';
import { GoLambdaFunction } from './goLambdaFunction';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';

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

    const COGNITO_TRIGGER_LAMBDA_PREFIX = '../lambda/cognitotrigger/cmd'
    const LAMBDA_POST_SIGNUP_LOCATION = `${COGNITO_TRIGGER_LAMBDA_PREFIX}/postconfirmation/main.go`

    this.domainPrefix = props.appPrefix
    this.cognitoDomain = `${props.appPrefix}.auth.${props.region}.amazoncognito.com`

    const postConfirmation = new GoLambdaFunction(this, props.appPrefix + "-post-confirmation", {
      name: props.appPrefix + '-post-confirmation',
      entry: LAMBDA_POST_SIGNUP_LOCATION,
    });
    postConfirmation.fn.role?.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonCognitoPowerUser")
    );

    this.userPool = new UserPool(this, this.domainPrefix + '-user-pool', {
        userPoolName: this.domainPrefix + '-userPool',
        signInAliases: {
          email: true,
        },
        selfSignUpEnabled: true,
        autoVerify: {
          email: true,
        },
        userVerification: {
          emailSubject: '[AWS Cloud FileShare] - Verification Code',
          emailBody: 'Verification Code: {####}',
          emailStyle: VerificationEmailStyle.CODE,
        },
        customAttributes: {
          isAdmin: new BooleanAttribute({
            mutable: true,
          }),
        },
        lambdaTriggers: {
          postConfirmation: postConfirmation.fn,
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

  addClient(id: string, callbackUrls: string[], signoutUrls: string[]) {
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
          scopes: [ OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE ],
        },
        supportedIdentityProviders: [
          UserPoolClientIdentityProvider.COGNITO
        ],
        accessTokenValidity: Duration.days(1),
        idTokenValidity: Duration.days(1),
        refreshTokenValidity: Duration.days(30),
        preventUserExistenceErrors: true,
      }
    );
    this.userPoolClientSecret = this.userPoolClient.userPoolClientSecret
  }
}
