import { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';
import { Authenticator } from 'cognito-at-edge';
import { SameSite } from './enums';

type SingleAuthenticatorParams = {
    region: string,
    logLevel?: any,
    userPoolIdResolver: () => Promise<string>,
    userPoolClientIdResolver: () => Promise<string>,
    userPoolDomainResolver: () => Promise<string>,
  };
  
  export class SingleAuthenticator {
  
    private static _authenticatorInstance: Authenticator;
  
    public static async handleAsync(event: CloudFrontRequestEvent, {
      region,
      logLevel,
      userPoolIdResolver,
      userPoolClientIdResolver,
      userPoolDomainResolver
    } : SingleAuthenticatorParams): Promise<CloudFrontRequestResult> {
        
      if (this._authenticatorInstance === undefined) {
        console.debug('fetcing ssm values')
        const [userPoolId, userPoolAppId, userPoolDomain] = await Promise.all([
          userPoolIdResolver(),
          userPoolClientIdResolver(),
          userPoolDomainResolver()]
        );

        console.debug('creating new _authenticatorInstance')
        this._authenticatorInstance = new Authenticator({
          region,
          userPoolId,
          userPoolAppId,
          userPoolDomain,
          cookieExpirationDays: 1,
          httpOnly: true,
          sameSite: SameSite.LAX,
          cookiePath: '/',
          logLevel,
        });
      }
      return this._authenticatorInstance.handle(event);
    }
  }
  