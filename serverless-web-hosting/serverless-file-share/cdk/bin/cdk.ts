#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FileShareServiceStack } from '../lib/file-share-service-stack';

const app = new cdk.App();

const appPrefix = 'file-share-service'
const edgeRegion = 'us-east-1';

const fileShareServiceSiteStack = new FileShareServiceStack(app, appPrefix + '-file-share-service-stack', {
  //To be able to deploy Lamda@Edge requires explicitly setting the region.
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  appPrefix: appPrefix,
  edgeRegion: edgeRegion,
})

cdk.Tags.of(fileShareServiceSiteStack).add("Project", "Demo File Share Service");
