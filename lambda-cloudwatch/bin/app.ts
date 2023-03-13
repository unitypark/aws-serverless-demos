#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaCloudwatchStack } from '../lib/lambda-cloudwatch';

const app = new cdk.App();
new LambdaCloudwatchStack(app, 'lambda-cloudwatch-stack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
