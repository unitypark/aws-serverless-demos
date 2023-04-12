#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FileShareServiceStack } from '../lib/file-share-service-stack';

const app = new cdk.App();
const fileShareServiceStack = new FileShareServiceStack(app, 'file-share-service-stack', {
  env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
  },
})

cdk.Tags.of(fileShareServiceStack).add("Project", "Sample File Share Service");

app.synth();
