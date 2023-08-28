import { Construct } from 'constructs';
import { Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import LambdaConstruct from './lambda-construct';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Domain } from 'aws-cdk-lib/aws-opensearchservice';

export interface RestApiProps {
    appPrefix: string;
    stageName: string;
    vpc: Vpc;
    masterUsername: string;
    osDomain: Domain;
}

export default class RestApiConstruct extends Construct {
  constructor(scope: Construct, id: string, props: RestApiProps) {
    super(scope, id);


    const API_LAMBDA_PREFIX = '../api/cmd'
    const LAMBDA_GET_GLOBAL_SEARCH_LOCATION = `${API_LAMBDA_PREFIX}/globalSearch/main.go`
    const LAMBDA_GET_INDEX_SEARCH_LOCATION = `${API_LAMBDA_PREFIX}/indexSearch/main.go`

    const globalSearchLambda = new LambdaConstruct(this, "GlobalSearch", {
      name: props.appPrefix + '-api-global-search',
      entry: LAMBDA_GET_GLOBAL_SEARCH_LOCATION,
      vpc: props.vpc,
      masterUsername: props.masterUsername,
      masterUserPassword: props.osDomain.masterUserPassword ? props.osDomain.masterUserPassword.unsafeUnwrap() : "",
      osDomain: props.osDomain,
    });

    const indexSearchLambda = new LambdaConstruct(this, "IndexSearch", {
      name: props.appPrefix + '-api-index-search',
      entry: LAMBDA_GET_INDEX_SEARCH_LOCATION,
      vpc: props.vpc,
      masterUsername: props.masterUsername,
      masterUserPassword: props.osDomain.masterUserPassword ? props.osDomain.masterUserPassword.unsafeUnwrap() : "",
      osDomain: props.osDomain,
    });

    this.api = new RestApi(this, 'Api', {
        restApiName: `${props.appPrefix}-rest-api`,
        deployOptions: {
          stageName: props.stageName,
        },
        defaultCorsPreflightOptions: {
          allowOrigins: Cors.ALL_ORIGINS,
          allowHeaders: [
            "Content-Type",
            "X-Amz-Date",
            "Authorization",
            "X-Api-Key",
            "X-Amz-Security-Token",
            "X-Amz-User-Agent",
            "Content-Encoding",
          ],
          allowMethods: Cors.ALL_METHODS,
          allowCredentials: true,
        },
        // This will enable Content Encoding
        minimumCompressionSize: 0,
    });
    
    const searchResource = this.api.root.addResource('search');
    searchResource.addMethod("GET", new LambdaIntegration(globalSearchLambda.fn));

    const indexSeacrhResource = searchResource.addResource('{index}')
    indexSeacrhResource.addMethod("GET", new LambdaIntegration(indexSearchLambda.fn));
  }

  public readonly api: RestApi
}
