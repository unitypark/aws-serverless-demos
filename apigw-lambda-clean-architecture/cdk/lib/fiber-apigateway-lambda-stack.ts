import * as cdk from 'aws-cdk-lib';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as golambda from '@aws-cdk/aws-lambda-go-alpha'
import { Construct } from 'constructs';

export class FiberApiGatewayLambdaStack extends cdk.Stack {
  private readonly ddbTable: ddb.Table

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const API_LAMBDA_PREFIX = '../api/cmd'
    const LAMBDA_GET_EMPLOYEES_LOCATION = `${API_LAMBDA_PREFIX}/getEmployees/main.go`
    const LAMBDA_PUT_EMPLOYEE_LOCATION = `${API_LAMBDA_PREFIX}/putEmployee/main.go`
    const LAMBDA_POST_EMPLOYEE_LOCATION = `${API_LAMBDA_PREFIX}/postEmployee/main.go`
    const LAMBDA_DELETE_EMPLOYEE_LOCATION = `${API_LAMBDA_PREFIX}/deleteEmployee/main.go`

    // create DynamoDB table
    this.ddbTable = new ddb.Table(this, 'CDKNotesTable', {
      tableName: 'Employee',
      billingMode: ddb.BillingMode.PROVISIONED,
      partitionKey: {
          name: 'LoginAlias',
          type: ddb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // api gateway
    const api = new apigateway.RestApi(this, 'employees-api');
    const employees = api.root.addResource('employees');

    // create lambda functions
    const getEmployeesHandler = this.createLambda('get-employees', LAMBDA_GET_EMPLOYEES_LOCATION)
    const postEmployeeHandler = this.createLambda('post-employee', LAMBDA_POST_EMPLOYEE_LOCATION) 
    const putEmployeeHandler = this.createLambda('put-employee', LAMBDA_PUT_EMPLOYEE_LOCATION) 
    const deleteEmployeeHandler = this.createLambda('delete-employee', LAMBDA_DELETE_EMPLOYEE_LOCATION) 

    // GET /employees
    employees.addMethod('GET',  new apigateway.LambdaIntegration(getEmployeesHandler)); 
    // POST /employees
    employees.addMethod('POST',  new apigateway.LambdaIntegration(postEmployeeHandler));   
    // PUT /employees
    employees.addMethod('PUT',  new apigateway.LambdaIntegration(putEmployeeHandler));  
    // DELETE /employees
    employees.addMethod('DELETE',  new apigateway.LambdaIntegration(deleteEmployeeHandler));  

    // print out the AppSync GraphQL endpoint to the terminal
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
    })
  }

  createLambda(name: string, entry: string): golambda.GoFunction {
    const functionName = name + 'Handler'
    const lambdaFn = new golambda.GoFunction(this, `${name}-handler`, {
        functionName,
        runtime: lambda.Runtime.PROVIDED_AL2,
        entry: entry,
        timeout: cdk.Duration.seconds(29),
        architecture: lambda.Architecture.ARM_64,
        memorySize: 256,
        tracing: lambda.Tracing.ACTIVE,
        environment: {
            EMPLOYEE_TABLE: this.ddbTable.tableName,
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
