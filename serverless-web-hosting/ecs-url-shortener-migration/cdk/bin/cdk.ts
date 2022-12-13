#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcsUrlShortenerMigrationStack } from '../lib/ecs-url-shortener-migration-stack';

const app = new cdk.App();
new EcsUrlShortenerMigrationStack(app, 'EcsUrlShortenerMigrationStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
