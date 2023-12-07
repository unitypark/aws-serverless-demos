#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WordpressEc2 } from '../lib/wordpress-ec2';

const app = new cdk.App();
new WordpressEc2(app, 'wordpress-ec2', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
