import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IHostedZone, PublicHostedZone } from "aws-cdk-lib/aws-route53";
import {
  Certificate,
  CertificateValidation,
  ICertificate,
} from "aws-cdk-lib/aws-certificatemanager";

interface Props extends StackProps {
  domainName: string
  fileshareServiceName: string
}

export class DistributionCertificate extends Stack {
  public readonly landingZoneCertificate: Certificate;
  public readonly fileshareServiceCertificate: Certificate;
  public readonly landingZoneHostedZone: IHostedZone;
  public readonly fileshareServiceZoneHostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    this.landingZoneHostedZone = PublicHostedZone.fromLookup(this, "LandingZonePublicHostedZoneImport", { 
      domainName: props.domainName 
    });

    this.fileshareServiceZoneHostedZone = PublicHostedZone.fromLookup(this, "FileShareServicePublicHostedZoneImport", { 
      domainName: `${props.fileshareServiceName}.${props.domainName}`
    });

    this.landingZoneCertificate = new Certificate(this, "LandingZoneDistributionCertificate", {
      domainName: props.domainName,
      validation: CertificateValidation.fromDns(this.landingZoneHostedZone),
    });

    this.fileshareServiceCertificate = new Certificate(this, "FileshareServiceCertificate", {
      domainName: `${props.fileshareServiceName}.${props.domainName}`,
      validation: CertificateValidation.fromDns(this.fileshareServiceZoneHostedZone),
    });
  }
}
