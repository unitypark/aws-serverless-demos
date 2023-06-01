import * as cdk from 'aws-cdk-lib';
import { LandingZoneStack } from '../lib/landing-zone-stack';
import { DistributionCertificate } from '../lib/certificate-stack';
import { FileShareServiceStack } from '../lib/file-share-service-stack';

const app = new cdk.App();

const appPrefix = 'ctse'
const edgeRegion = 'us-east-1';
const fileshareServiceName = 'fileshare';
const landingZoneDomainName = app.node.tryGetContext('domainName');

if (landingZoneDomainName === undefined) {
  new LandingZoneStack(app, appPrefix + '-landing-zone-stack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    appPrefix: appPrefix,
  })
} else {
  const distributionCertificationStack = new DistributionCertificate(app, appPrefix + '-certificate-stack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: edgeRegion,
    },
    domainName: landingZoneDomainName,
    fileshareServiceName: fileshareServiceName,
    crossRegionReferences: true,
  });
  
  new LandingZoneStack(app, appPrefix + '-landing-zone-stack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    appPrefix: appPrefix,
    publicDomainName: landingZoneDomainName,
    landingZoneHostedZone: distributionCertificationStack.landingZoneHostedZone,
    certificate: distributionCertificationStack.landingZoneCertificate,
    crossRegionReferences: true,
  })
  
  new FileShareServiceStack(app, appPrefix + '-fileshare-service-stack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    appPrefix: appPrefix,
    edgeRegion: edgeRegion,
    fileshareServiceDomainName: `${fileshareServiceName}.${landingZoneDomainName}`,
    fileshareServiceZoneHostedZone: distributionCertificationStack.fileshareServiceZoneHostedZone,
    certificate: distributionCertificationStack.fileshareServiceCertificate,
    crossRegionReferences: true,
  })
}
