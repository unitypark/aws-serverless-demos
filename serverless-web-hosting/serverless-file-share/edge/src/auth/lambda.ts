import { CloudFrontRequestEvent, CloudFrontRequestHandler } from 'aws-lambda';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { SingleAuthenticator } from '../helper/async-auth';
import { LogLevel, Region } from '../helper/enums';

const appPrefix = 'file-share'

const ssmParamNames = {
  userPoolIdParamName: `/${appPrefix}/cognito/userpool/id`,
  userPoolClientIdParamName: `/${appPrefix}/cognito/userpool/client/id`,
  userPoolDomainParamName: `/${appPrefix}/cognito/userpool/domain`
};

const ssmClient = new SSMClient({ region: Region.EDGE });

export const handler: CloudFrontRequestHandler =
  async (event: CloudFrontRequestEvent) => SingleAuthenticator.handleAsync(
    event,
    {
      region: Region.DEFAULT,
      logLevel: LogLevel.DEBUG,
      userPoolIdResolver:
        async () => (
          await ssmClient.send(new GetParameterCommand({ Name: ssmParamNames.userPoolIdParamName }))
        ).Parameter?.Value || '',
      userPoolClientIdResolver:
        async () => (
          await ssmClient.send(new GetParameterCommand({ Name: ssmParamNames.userPoolClientIdParamName }))
        ).Parameter?.Value || '',
      userPoolDomainResolver:
        async () => (
          await ssmClient.send(new GetParameterCommand({ Name: ssmParamNames.userPoolDomainParamName }))
        ).Parameter?.Value || '',
});

