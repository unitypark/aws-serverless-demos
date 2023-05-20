import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { experimental } from 'aws-cdk-lib/aws-cloudfront';

export interface NodeLambdaEdgeFunctionProps {
    path: string;
    handler: string;
}

export class NodeLambdaEdgeFunction extends Construct {
    public readonly fn: experimental.EdgeFunction
    
    constructor(scope: Construct, id: string, props: NodeLambdaEdgeFunctionProps) {
    super(scope, id);
    
    this.fn = new experimental.EdgeFunction(this, `${id}-handler`,
    {
      code: lambda.Code.fromAsset(props.path),
      handler: props.handler,
      runtime: lambda.Runtime.NODEJS_18_X,
    });
  }
}
