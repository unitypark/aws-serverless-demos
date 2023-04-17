#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { StaticSiteStack } from '../lib/static-site-stack';

const app = new cdk.App();

const appPrefix = 'file-share'
const edgeRegion = 'us-east-1';

const staticSiteStack = new StaticSiteStack(app, appPrefix + '-static-site-stack', {
  //To be able to deploy Lamda@Edge requires explicitly setting the region.
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  appPrefix: appPrefix,
  edgeRegion: edgeRegion,
})

cdk.Tags.of(staticSiteStack).add("Project", "Demo File Share Service");
