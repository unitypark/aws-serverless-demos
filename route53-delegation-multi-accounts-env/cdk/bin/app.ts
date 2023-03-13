#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CentralNetworkingStack } from '../lib/central-networking-stack';

const app = new cdk.App();
new CentralNetworkingStack(app, 'CentralNetworkingStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});