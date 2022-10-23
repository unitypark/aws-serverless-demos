#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FiberApiGatewayLambdaStack } from '../lib/fiber-apigateway-lambda-stack';

const app = new cdk.App();
new FiberApiGatewayLambdaStack(app, 'FiberApiGatewayLambdaStack', {
  env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
  },
})