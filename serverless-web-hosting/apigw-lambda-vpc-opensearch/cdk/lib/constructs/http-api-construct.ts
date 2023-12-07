import LambdaConstruct from './lambda-construct';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Domain } from 'aws-cdk-lib/aws-opensearchservice';
import { CorsHttpMethod, HttpApi, HttpMethod, PayloadFormatVersion } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';

export interface HTTPApiProps {
    appPrefix: string;
    apiRoute: string;
    vpc: Vpc;
    masterUsername: string;
    osDomain: Domain;
    cloudfrontDomain: string,
}

export default class HTTPApiConstruct extends Construct {
  constructor(scope: Construct, id: string, props: HTTPApiProps) {
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

    this.api = new HttpApi(this, props.appPrefix + '-http-api', {
      description: `${props.appPrefix}-http-api for opensearch demo`,
      apiName: `${props.appPrefix}-http-api`,
      createDefaultStage: true,
      corsPreflight: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
          "X-Amz-User-Agent",
          "Content-Encoding",
        ],
        allowMethods: [
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.GET,
        ],
        allowCredentials: true,
        allowOrigins: ['http://localhost:3000/', props.cloudfrontDomain],
      },
    });

    this.api.addRoutes({
      path: `${props.apiRoute}/search`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('global-search-lambda-integration', globalSearchLambda.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
    });

    this.api.addRoutes({
      path: `${props.apiRoute}/search/{index}`,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('index-search-lambda-integration', indexSearchLambda.fn, {
        payloadFormatVersion: PayloadFormatVersion.VERSION_2_0
      }),
    });
  }

  public readonly api: HttpApi
}
