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
  public readonly certificate: Certificate;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const hostedZone = PublicHostedZone.fromLookup(this, "PublicHostedZoneImport", { 
      domainName: props.domainName 
    });

    this.certificate = new Certificate(this, "DistributionCertificate", {
      domainName: props.domainName,
      validation: CertificateValidation.fromDns(hostedZone),
    });
  }
}