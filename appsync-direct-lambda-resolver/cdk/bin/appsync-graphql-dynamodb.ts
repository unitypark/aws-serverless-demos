#!/usr/bin/env node
import * as cdk from '@aws-cdk/core'
import { AppsyncGraphqlDynamodbStack } from '../lib/appsync-graphql-dynamodb-stack'

const app = new cdk.App()

new AppsyncGraphqlDynamodbStack(app, 'AppsyncGraphqlDynamodbStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
})
app.synth()
