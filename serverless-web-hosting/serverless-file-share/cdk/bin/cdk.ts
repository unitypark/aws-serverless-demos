#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { StaticSiteStack } from '../lib/static-site-stack';

const app = new cdk.App();

const staticSiteStack = new StaticSiteStack(app, 'file-share-static-site-stack', {
  //To be able to deploy Lamda@Edge requires explicitly setting the region.
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})

cdk.Tags.of(staticSiteStack).add("Project", "Sample File Share Service");

app.synth();
