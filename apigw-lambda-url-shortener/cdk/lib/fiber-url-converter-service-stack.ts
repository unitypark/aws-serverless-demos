import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as golambda from '@aws-cdk/aws-lambda-go-alpha'
import { Construct } from 'constructs';

export class FiberUrlConverterServiceStack extends cdk.Stack {
  private readonly ddbTable: ddb.Table

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const API_LAMBDA_PREFIX = '../api/cmd'
    const LAMBDA_GET_URL_LOCATION = `${API_LAMBDA_PREFIX}/getUrl/main.go`
    const LAMBDA_POST_URL_LOCATION = `${API_LAMBDA_PREFIX}/postUrl/main.go`

    // create DynamoDB table
    this.ddbTable = new ddb.Table(this, 'CDKNotesTable', {
      tableName: 'url-mapping-table',
      billingMode: ddb.BillingMode.PROVISIONED,
      partitionKey: {
          name: 'ID',
          type: ddb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Creating entity index
    this.ddbTable.addGlobalSecondaryIndex({
      indexName: "Entities",
      partitionKey: { name: `Type`, type: ddb.AttributeType.STRING },
      sortKey: { name: `State`, type: ddb.AttributeType.STRING },
      projectionType: ddb.ProjectionType.ALL,
    });

    // api gateway
    const api = new apigateway.RestApi(this, 'url-converter-api');
    const urls = api.root.addResource('urls');
    const singleUrl = urls.addResource("{path}");

    // create lambda functions
    const postUrlHandler = this.createLambda('post-url', LAMBDA_POST_URL_LOCATION) 
    const getUrlHandler = this.createLambda('get-url', LAMBDA_GET_URL_LOCATION)

    // POST /urls
    urls.addMethod('POST',  new apigateway.LambdaIntegration(postUrlHandler));   

    // GET /urls/{path}
    singleUrl.addMethod('GET',  new apigateway.LambdaIntegration(getUrlHandler)); 


    // print out the AppSync GraphQL endpoint to the terminal
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
    })
  }

  createLambda(name: string, entry: string): golambda.GoFunction {
    const functionName = name + '-handler'
    const lambdaFn = new golambda.GoFunction(this, `${name}-handler`, {
        functionName,
        runtime: lambda.Runtime.PROVIDED_AL2,
        entry: entry,
        timeout: cdk.Duration.seconds(29),
        architecture: lambda.Architecture.ARM_64,
        memorySize: 256,
        tracing: lambda.Tracing.ACTIVE,
        environment: {
          URL_TABLE: this.ddbTable.tableName,
        },
    })
    new logs.LogGroup(this, `${name}-log-group`, {
        logGroupName: `/aws/lambda/${lambdaFn.functionName}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_DAY,
    })
    this.ddbTable.grantFullAccess(lambdaFn)
    return lambdaFn
  }
}
