import { CloudFrontRequestEvent, CloudFrontRequestHandler } from "aws-lambda";

import { AuthenticationHandler } from "../helpers/auth-handler";
import { Region } from "../typings/cognitoAtEdge";

export const handler: CloudFrontRequestHandler = async (
  event: CloudFrontRequestEvent,
) =>
  AuthenticationHandler.checkAuth(event, {
    region: Region.DEFAULT,
    logLevel: "info",
  });
