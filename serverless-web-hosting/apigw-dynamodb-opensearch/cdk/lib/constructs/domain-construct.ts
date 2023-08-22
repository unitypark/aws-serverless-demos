import { Construct } from 'constructs';
import { IHostedZone, PublicHostedZone } from 'aws-cdk-lib/aws-route53';

export interface CertificateProps {
    baseDomain: string
    subDomain: string
}

export default class DomainConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CertificateProps) {
    super(scope, id);

    this.serviceDomain = `${props.subDomain}.${props.baseDomain}`

    this.serviceHostedZone = PublicHostedZone.fromLookup(this, "ImportPublicHostedZone", { 
      domainName: this.serviceDomain
    });
  }

  public readonly serviceDomain: string;
  public readonly serviceHostedZone: IHostedZone;
}
