#!/usr/bin/env node
import * as cdk from '@aws-cdk/core'
import { AppsyncEventBridgeSubscriberStack } from '../lib/appsync-eventbridge-subscriber-stack'

const app = new cdk.App()

new AppsyncEventBridgeSubscriberStack(
    app,
    'AppsyncEventBridgeSubscriberStack',
    {
        env: {
            account: process.env.CDK_DEFAULT_ACCOUNT,
            region: process.env.CDK_DEFAULT_REGION,
        },
    }
)
app.synth()
