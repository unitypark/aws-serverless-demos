import * as cdk from 'aws-cdk-lib';
import { FileShareServiceStack } from '../lib/file-share-service-stack';
import { DistributionCertificate } from '../lib/certificate-stack';

const app = new cdk.App();

const appPrefix = 'file-share-service'
const edgeRegion = 'us-east-1';
const domainName = app.node.tryGetContext('domainName');

if (domainName === undefined) {
  new FileShareServiceStack(app, appPrefix + '-app-stack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    appPrefix: appPrefix,
    edgeRegion: edgeRegion,
    crossRegionReferences: true,
  })
} else {
  const distributionCertificationStack = new DistributionCertificate(app, appPrefix + '-certificate-stack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: edgeRegion,
    },
    domainName: domainName,
    crossRegionReferences: true,
  });

  new FileShareServiceStack(app, appPrefix + '-app-stack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    appPrefix: appPrefix,
    edgeRegion: edgeRegion,
    domainName: domainName,
    certificate: distributionCertificationStack.certificate,
    crossRegionReferences: true,
  })
}
