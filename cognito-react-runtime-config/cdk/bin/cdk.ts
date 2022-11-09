#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CognitoReactRuntimeConfigStack } from '../lib/cognito-react-runtime-config-stack';

const app = new cdk.App();
new CognitoReactRuntimeConfigStack(app, 'CognitoReactRuntimeConfigStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

app.synth();