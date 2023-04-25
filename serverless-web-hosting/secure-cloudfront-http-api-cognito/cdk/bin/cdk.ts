#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NetworkStationStack } from '../lib/network-station-stack';

const app = new cdk.App();

const appPrefix = 'network-station'
const edgeRegion = 'us-east-1';

const networkStationStack = new NetworkStationStack(app, appPrefix + '-stack', {
  //To be able to deploy Lamda@Edge requires explicitly setting the region.
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  appPrefix: appPrefix,
  edgeRegion: edgeRegion,
})

cdk.Tags.of(networkStationStack).add("Project", "Demo Network Station Speed Service");
