#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { FileShareService } from "../lib/fileshare-service";

const app = new cdk.App();
const appContext = app.node.tryGetContext("app");

new FileShareService(app, appContext.name + "-service-stack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  prefix: appContext.name,
});
