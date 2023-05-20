import * as constructs from "constructs"
import * as cognito from "aws-cdk-lib/aws-cognito"
import * as iam from "aws-cdk-lib/aws-iam"
import * as cr from "aws-cdk-lib/custom-resources"
import CognitoPassword from "aws-cognito-temporary-password-generator"

interface Props {
  username: string
  role: string
  userAttributes: {
    Name: string;
    Value: string;
  }[]
  userPool: cognito.IUserPool
}

export class CognitoUser extends constructs.Construct {
  public readonly username: string;
  public readonly password: string;

  constructor(scope: constructs.Construct, id: string, props: Props) {
    super(scope, id)

    // Reference - https://github.com/hugtechio/aws-cognito-temporary-password-generator
    const generator = new CognitoPassword()
    this.username = props.username
    this.password = generator.generate()

    const user = new cr.AwsCustomResource(this, props.username + "-user", {
      onCreate: {
        service: "CognitoIdentityServiceProvider",
        action: "adminCreateUser",
        parameters: {
          UserPoolId: props.userPool.userPoolId,
          Username: props.username,
          UserAttributes: props.userAttributes
        },
        physicalResourceId: cr.PhysicalResourceId.of(`AwsCustomResource-AdminCreateUser-${props.username}`),
      },
      onDelete: {
        service: "CognitoIdentityServiceProvider",
        action: "adminDeleteUser",
        parameters: {
          UserPoolId: props.userPool.userPoolId,
          Username: props.username,
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            "cognito-idp:AdminCreateUser",
            "cognito-idp:AdminDeleteUser",
          ],
          resources: [props.userPool.userPoolArn],
        }),
      ]),
    })

    const password = new cr.AwsCustomResource(this, props.username + "-password", {
      onUpdate: {
        service: "CognitoIdentityServiceProvider",
        action: "adminSetUserPassword",
        parameters: {
          UserPoolId: props.userPool.userPoolId,
          Username: props.username,
          Password: this.password,
          Permanent: true,
        },
        physicalResourceId: cr.PhysicalResourceId.of(`AwsCustomResource-AdminSetUserPassword-${props.username}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["cognito-idp:AdminSetUserPassword"],
          resources: [props.userPool.userPoolArn],
        }),
      ]),
    })
    password.node.addDependency(user)
  }
}