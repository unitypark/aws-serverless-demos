#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OpenSearchStack } from '../lib/opensearch-stack';

const app = new cdk.App();
const appContext = app.node.tryGetContext('app');

new OpenSearchStack(app, 'OpenSearchStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  prefix: appContext.name,
  baseDomain: appContext.baseDoamin,
  subDomain: appContext.subdomain,
});