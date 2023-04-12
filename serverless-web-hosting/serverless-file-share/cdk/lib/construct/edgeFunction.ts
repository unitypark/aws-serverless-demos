import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs';
import { experimental } from 'aws-cdk-lib/aws-cloudfront';
import path = require('path');

export interface NodeEdgeLambdaFunctionProps {
    name: string;
    handler: string;
}

export class NodeEdgeLambdaFunction extends Construct {
    public readonly fn: experimental.EdgeFunction
    
    constructor(scope: Construct, id: string, props: NodeEdgeLambdaFunctionProps) {
    super(scope, id);
    
    this.fn = new experimental.EdgeFunction(this, `${props.name}-handler`,
    {
      code: lambda.Code.fromAsset(path.join(__dirname, "../cloudfront")),
      handler: props.handler,
      runtime: lambda.Runtime.NODEJS_14_X,
    });
  }
}
