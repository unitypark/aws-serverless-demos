import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";

import { Authenticator } from "../auth/authenticator";
import { AuthenticatorLogLevel, Region } from "../typings/cognitoAtEdge";

type AsyncHandlerParams = {
  region: string;
  logLevel?: AuthenticatorLogLevel;
};

type AuthenticationGatewayConfig = {
  userPoolId: string;
  appClientId: string;
  appClientSecret: string;
  userPoolDomain: string;
};

export class AuthenticationHandler {
  private static _authenticatorInstance: Authenticator;

  /**
   * Retrieve json string cognito configutation from parameter store
   * @param  {SSMClient} ssmClient SSM Client
   * @param  {String} prefix    Prefix of domain
   * @return {Promise} JSON String about cognito configuration
   */
  private static _authenticationGatewayParameterResolver = async (
    ssmClient: SSMClient,
    prefix: string,
  ): Promise<string> => {
    return (
      (
        await ssmClient.send(
          new GetParameterCommand({
            Name: `/${prefix}/authentication-gateway-config`,
          }),
        )
      ).Parameter?.Value || ""
    );
  };

  public static async checkAuth(
    event: CloudFrontRequestEvent,
    { region, logLevel }: AsyncHandlerParams,
  ): Promise<CloudFrontRequestResult> {
    console.info("cloudfront request event for checkAuth: %j", event);
    if (this._authenticatorInstance === undefined) {
      const appPrefix = "fileshare";
      const ssmClient = new SSMClient({ region: Region.DEFAULT });

      const [authenticationGatewayParameterJson] = await Promise.all([
        this._authenticationGatewayParameterResolver(ssmClient, appPrefix),
      ]);
      console.debug(
        "authentication parameter json: ",
        authenticationGatewayParameterJson,
      );

      const authenticationGatewayConfig: AuthenticationGatewayConfig =
        JSON.parse(authenticationGatewayParameterJson);
      console.debug(
        "authentication gateway config: ",
        authenticationGatewayConfig,
      );

      this._authenticatorInstance = new Authenticator({
        region,
        logLevel,
        userPoolId: authenticationGatewayConfig.userPoolId,
        userPoolAppId: authenticationGatewayConfig.appClientId,
        userPoolAppSecret: authenticationGatewayConfig.appClientSecret,
        userPoolDomain: authenticationGatewayConfig.userPoolDomain,
        parseAuthPath: "signin",
        sameSite: "Lax",
        cookieSettingsOverrides: {
          accessToken: {
            // valid for 30 min
            expirationSeconds: 1800,
            path: "/api",
          },
          idToken: {
            // valid for 30 min
            expirationSeconds: 1800,
            path: "/",
          },
          refreshToken: {
            // valid for 8 hours
            expirationSeconds: 28800,
            path: "/",
          },
        },
        csrfProtection: {
          nonceSigningSecret: appPrefix,
        },
      });
    }
    return this._authenticatorInstance.handleCheckAuth(event);
  }

  public static async parseAuth(
    event: CloudFrontRequestEvent,
    { region, logLevel }: AsyncHandlerParams,
  ): Promise<CloudFrontRequestResult> {
    console.info("cloudfront request event for parseAuth: %j", event);

    if (this._authenticatorInstance === undefined) {
      const appPrefix = "fileshare";
      const ssmClient = new SSMClient({ region: Region.DEFAULT });

      const [authenticationGatewayParameterJson] = await Promise.all([
        this._authenticationGatewayParameterResolver(ssmClient, appPrefix),
      ]);
      console.debug(
        "authentication parameter json: ",
        authenticationGatewayParameterJson,
      );

      const authenticationGatewayConfig: AuthenticationGatewayConfig =
        JSON.parse(authenticationGatewayParameterJson);
      console.debug(
        "authentication gateway config: ",
        authenticationGatewayConfig,
      );

      this._authenticatorInstance = new Authenticator({
        region,
        logLevel,
        userPoolId: authenticationGatewayConfig.userPoolId,
        userPoolAppId: authenticationGatewayConfig.appClientId,
        userPoolAppSecret: authenticationGatewayConfig.appClientSecret,
        userPoolDomain: authenticationGatewayConfig.userPoolDomain,
        parseAuthPath: "signin",
        sameSite: "Lax",
        cookieSettingsOverrides: {
          accessToken: {
            // valid for 30 min
            expirationSeconds: 1800,
            path: "/api",
          },
          idToken: {
            // valid for 30 min
            expirationSeconds: 1800,
            path: "/",
          },
          refreshToken: {
            // valid for 8 hours
            expirationSeconds: 28800,
            path: "/",
          },
        },
        csrfProtection: {
          nonceSigningSecret: appPrefix,
        },
      });
    }
    return this._authenticatorInstance.handleParseAuth(event);
  }
}
