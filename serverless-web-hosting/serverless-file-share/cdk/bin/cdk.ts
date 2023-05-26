import * as cdk from 'aws-cdk-lib';
import { FileShareServiceLandingZoneStack } from '../lib/file-share-landing-zone-stack';
import { DistributionCertificate } from '../lib/certificate-stack';
import { FileShareProtectedServiceStack } from '../lib/file-share-protected-service-stack';

const app = new cdk.App();

const appPrefix = 'file-share-service'
const edgeRegion = 'us-east-1';
const domainName = app.node.tryGetContext('domainName');

if (domainName === undefined) {
  new FileShareServiceLandingZoneStack(app, appPrefix + '-landing-zone-stack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    appPrefix: appPrefix,
    edgeRegion: edgeRegion,
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

  new FileShareServiceLandingZoneStack(app, appPrefix + '-landing-zone-stack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    appPrefix: appPrefix,
    edgeRegion: edgeRegion,
    publicDomainName: domainName,
    certificate: distributionCertificationStack.landingZoneCertificate,
    crossRegionReferences: true,
  })

  new FileShareProtectedServiceStack(app, appPrefix + '-protected-service-stack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    appPrefix: appPrefix,
    edgeRegion: edgeRegion,
    protectedDomainName: `protected.${domainName}`,
    certificate: distributionCertificationStack.protectedServiceCertificate,
    crossRegionReferences: true,
  })
}
