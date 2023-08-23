import { Construct } from 'constructs';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import OpenSearchConstruct from './constructs/opensearch-construct';
import NetworkConstruct from './constructs/network-construct';
import BastionConstruct from './constructs/bastion-construct';
import LambdaConstruct from './constructs/lambda-construct';
import { Port } from 'aws-cdk-lib/aws-ec2';
import RestApiConstruct from './constructs/rest-api-construct';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

interface Props extends StackProps {
  prefix: string
}

export class OpenSearchStack extends Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    const API_LAMBDA_PREFIX = '../api/cmd'
    const LAMBDA_POST_SEARCH_LOCATION = `${API_LAMBDA_PREFIX}/postSearch/main.go`

    const network = new NetworkConstruct(this, "NetworkConstruct", {
      appPrefix: props.prefix,
    });

    new BastionConstruct(this, "BastionConstruct", {
      appPrefix: props.prefix,
      vpc: network.vpc,
      bastionSecurityGroup: network.bastionSecurityGroup,
    });

    const opensearch = new OpenSearchConstruct(this, "OpenSearchConstruct", {
      region: this.region,
      account: this.account,
      appPrefix: props.prefix,
      vpc: network.vpc,
      opensearchSecurityGroup: network.opensearchSecurityGroup,
    });

    const postSearchLambda = new LambdaConstruct(this, "PostSearchLambda", {
      name: props.prefix + '-api-post-search',
      entry: LAMBDA_POST_SEARCH_LOCATION,
      vpc: network.vpc,
      environmentVariables: {
        OPENSEARCH_HOST: opensearch.osDomain.domainEndpoint,
      }
    });
    opensearch.osDomain.connections.allowFrom(postSearchLambda.fn, Port.tcp(443));

    new RestApiConstruct(this, "RestApiConstruct", {
      appPrefix: props.prefix,
      searchFn: postSearchLambda.fn
    })

    new CfnOutput(this, 'OpenSearchDashboardDomainEndpoint', {
      value: `${opensearch.osDomain.domainEndpoint}`
    });

    new CfnOutput(this, "PostSearchHandlerFunctionName", {
      value: postSearchLambda.fn.functionName,
    });
  }
}
