import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IHostedZone, PublicHostedZone } from "aws-cdk-lib/aws-route53";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";

interface Props extends StackProps {
  baseDomain: string
  subDomain: string
}

export class DistributionCertificate extends Stack {
  public readonly serviceDomain: string;
  public readonly serviceCertificate: Certificate;
  public readonly serviceHostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    this.serviceDomain = `${props.subDomain}.${props.baseDomain}`

    this.serviceHostedZone = PublicHostedZone.fromLookup(this, "ImportPublicHostedZone", { 
      domainName: this.serviceDomain
    });

    this.serviceCertificate = new Certificate(this, "Certificate", {
      domainName: this.serviceDomain,
      validation: CertificateValidation.fromDns(this.serviceHostedZone),
    });
  }
}
