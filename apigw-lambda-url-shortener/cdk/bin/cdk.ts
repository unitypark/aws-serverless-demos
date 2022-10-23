#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FiberUrlConverterServiceStack } from '../lib/fiber-url-converter-service-stack';

const app = new cdk.App();
new FiberUrlConverterServiceStack(app, 'FiberUrlConverterServiceStack', {
  env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
  },
})