import { Construct } from 'constructs';
import { GoFunction } from '@aws-cdk/aws-lambda-go-alpha';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';

export interface RestApiProps {
    appPrefix: string;
    searchFn: GoFunction;
}

export default class RestApiConstruct extends Construct {
  constructor(scope: Construct, id: string, props: RestApiProps) {
    super(scope, id);

    const api = new RestApi(this, 'Api', {
        restApiName: `${props.appPrefix}-rest-api`,
     });

    const searchApi = api.root.addResource('search');
    searchApi.addMethod("POST", new LambdaIntegration(props.searchFn));
  }
}
