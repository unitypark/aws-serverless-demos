import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { PublicHostedZone } from "aws-cdk-lib/aws-route53";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";

interface Props extends StackProps {
  domainName: string
}

export class DistributionCertificate extends Stack {
  public readonly landingZoneCertificate: Certificate;
  public readonly protectedServiceCertificate: Certificate;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const landingZoneHostedZone = PublicHostedZone.fromLookup(this, "LandingZonePublicHostedZoneImport", { 
      domainName: props.domainName 
    });

    const protectedServiceZoneHostedZone = PublicHostedZone.fromLookup(this, "ProtectedPublicHostedZoneImport", { 
      domainName: `protected.${props.domainName}`
    });

    this.landingZoneCertificate = new Certificate(this, "LandingZoneDistributionCertificate", {
      domainName: props.domainName,
      validation: CertificateValidation.fromDns(landingZoneHostedZone),
    });

    this.protectedServiceCertificate = new Certificate(this, "ProtectedServiceDistributionCertificate", {
      domainName: `protected.${props.domainName}`,
      validation: CertificateValidation.fromDns(protectedServiceZoneHostedZone),
    });
  }
}
