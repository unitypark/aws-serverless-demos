import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IHostedZone, PublicHostedZone } from "aws-cdk-lib/aws-route53";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";

interface Props extends StackProps {
  baseDomain: string
  serviceName: string
}

export class DistributionCertificate extends Stack {
  public readonly serviceDomain: string;
  public readonly serviceCertificate: Certificate;
  public readonly serviceHostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    this.serviceDomain = `${props.serviceName}.${props.baseDomain}`

    this.serviceHostedZone = PublicHostedZone.fromLookup(this, `${props.serviceName}-import-hostedZone`, { 
      domainName: this.serviceDomain
    });

    this.serviceCertificate = new Certificate(this, `${props.serviceName}-certificate`, {
      domainName: this.serviceDomain,
      validation: CertificateValidation.fromDns(this.serviceHostedZone),
    });
  }
}
