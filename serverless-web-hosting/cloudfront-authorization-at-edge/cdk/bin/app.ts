#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FileShareService } from '../lib/fileshare-service';
import { DistributionCertificate } from '../lib/certificate';

const app = new cdk.App();
const appContext = app.node.tryGetContext('app');



const distributionCertificationStack = new DistributionCertificate(app, appContext.name + '-certificate-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  baseDomain: appContext.baseDoamin,
  subDomain: appContext.subdomain,
  crossRegionReferences: true,
});

new FileShareService(app, appContext.name + '-service-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  prefix: appContext.name,
  domain: distributionCertificationStack.serviceDomain,
  hostedZone: distributionCertificationStack.serviceHostedZone,
  certificate: distributionCertificationStack.serviceCertificate,
  crossRegionReferences: true,
});
