import * as cdk from '@aws-cdk/core'
import * as appsync from '@aws-cdk/aws-appsync'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as golambda from '@aws-cdk/aws-lambda-go'
import * as lambda from '@aws-cdk/aws-lambda'
import * as logs from '@aws-cdk/aws-logs'
import * as events from '@aws-cdk/aws-events'
import * as iam from '@aws-cdk/aws-iam'

const GRAPTHQL_API_PREFIX = '../src/go-graphql/cmd'

const LAMBDA_GET_MESSAGE_BY_ID_LOCATION = `${GRAPTHQL_API_PREFIX}/getMessageById/main.go`
const LAMBDA_LIST_MESSAGES_LOCATION = `${GRAPTHQL_API_PREFIX}/listMessages/main.go`

const LAMBDA_CREATE_MESSAGE_LOCATION = `${GRAPTHQL_API_PREFIX}/createMessage/main.go`
const LAMBDA_UPDATE_MESSAGE_LOCATION = `${GRAPTHQL_API_PREFIX}/updateMessage/main.go`
const LAMBDA_DELETE_MESSAGE_LOCATION = `${GRAPTHQL_API_PREFIX}/deleteMessage/main.go`

export class AppsyncEventBridgeSubscriberStack extends cdk.Stack {
    private readonly ddbTable: ddb.Table
    private readonly appSyncApi: appsync.GraphqlApi
    private readonly eventBus: events.CfnEventBus

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        this.appSyncApi = new appsync.GraphqlApi(this, 'Api', {
            name: 'Messages-appsync-api',
            schema: appsync.Schema.fromAsset('../client/schema.graphql'),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: appsync.AuthorizationType.API_KEY,
                    apiKeyConfig: {
                        expires: cdk.Expiration.after(cdk.Duration.days(365)),
                    },
                },
                additionalAuthorizationModes: [
                    { authorizationType: appsync.AuthorizationType.IAM },
                ],
            },
            logConfig: {
                fieldLogLevel: appsync.FieldLogLevel.ALL,
            },
            xrayEnabled: true,
        })

        // create event bus to publish events to lambda resolvers
        this.eventBus = new events.CfnEventBus(this, 'bus', {
            name: 'real-time-message-bus',
        })

        const connection = new events.CfnConnection(this, 'AppSyncConnection', {
            authorizationType: 'API_KEY',
            authParameters: {
                apiKeyAuthParameters: {
                    apiKeyName: 'x-api-key',
                    apiKeyValue: this.appSyncApi.apiKey!,
                },
            },
        })

        const destination = new events.CfnApiDestination(
            this,
            'AppSyncDestination',
            {
                connectionArn: connection.attrArn,
                httpMethod: 'POST',
                invocationEndpoint: this.appSyncApi.graphqlUrl,
            }
        )

        const role = new iam.Role(this, 'EventBridgeAppSyncRole', {
            assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
            inlinePolicies: {
                invokeAPI: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            resources: [
                                `arn:aws:events:${this.region}:${this.account}:api-destination/${destination.ref}/*`,
                            ],
                            actions: ['events:InvokeApiDestination'],
                        }),
                    ],
                }),
            },
        })

        const appSyncCreateMessagehrule = new events.CfnRule(
            this,
            'AppSyncCreateMessageRule',
            {
                name: 'create-message-rule',
                description: 'AppSync createMessage mutation invocation rule',
                eventBusName: this.eventBus.attrName,
                eventPattern: {
                    source: ['micro.message.create'],
                    'detail-type': ['appsync.mutation.message.create'],
                    detail: {
                        topic: [{ exists: true }],
                        text: [{ exists: true }],
                    },
                },
                targets: [
                    {
                        id: 'default-target-appsync',
                        arn: destination.attrArn,
                        roleArn: role.roleArn,
                        inputTransformer: {
                            inputPathsMap: {
                                topic: '$.detail.topic',
                                text: '$.detail.text',
                            },
                            inputTemplate: `{
                    "query": "mutation CreateMessage($topic:String!, $text:String!) {
                        createMessage(topic:$topic, text:$text) { id text topic }
                    }",
                    "operationName": "CreateMessage",
                    "variables": {
                      "topic": "<topic>",
                      "text": "<text>"
                    }
                  }`.replace(/\n\s*/g, ' '),
                        },
                    },
                ],
            }
        )
        appSyncCreateMessagehrule.addDependsOn(this.eventBus)

        const appSyncUpdateMessagehrule = new events.CfnRule(
            this,
            'AppSyncUpdateMessageRule',
            {
                name: 'update-message-rule',
                description: 'AppSync updateMessage mutation invocation rule',
                eventBusName: this.eventBus.attrName,
                eventPattern: {
                    source: ['micro.message.update'],
                    'detail-type': ['appsync.mutation.message.update'],
                    detail: {
                        id: [{ exists: true }],
                        topic: [{ exists: true }],
                        text: [{ exists: true }],
                    },
                },
                targets: [
                    {
                        id: 'default-target-appsync',
                        arn: destination.attrArn,
                        roleArn: role.roleArn,
                        inputTransformer: {
                            inputPathsMap: {
                                id: '$.detail.id',
                                topic: '$.detail.topic',
                                text: '$.detail.text',
                            },
                            inputTemplate: `{
                    "query": "mutation UpdateMessage($id:ID!, $topic:String!, $text:String!) {
                        updateMessage(id:$id, topic:$topic, text:$text) { id text topic }
                    }",
                    "operationName": "UpdateMessage",
                    "variables": {
                      "id": "<id>",
                      "topic": "<topic>",
                      "text": "<text>"
                    }
                  }`.replace(/\n\s*/g, ' '),
                        },
                    },
                ],
            }
        )
        appSyncUpdateMessagehrule.addDependsOn(this.eventBus)

        // create DynamoDB table
        this.ddbTable = new ddb.Table(this, 'CDKMessagesTable', {
            tableName: 'messages-appsync-api-table',
            billingMode: ddb.BillingMode.PROVISIONED,
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING,
            },
            sortKey: {
                name: 'topic',
                type: ddb.AttributeType.STRING,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        })

        /**
         * AppSync Query Lambda Resolvers
         */
        const getMessageByIdLambda = this.createLambda(
            'GetMessageById',
            LAMBDA_GET_MESSAGE_BY_ID_LOCATION
        )
        const listMessagesLambda = this.createLambda(
            'ListMessages',
            LAMBDA_LIST_MESSAGES_LOCATION
        )

        /**
         * AppSync Mutation Lambda Resolvers
         */
        const createMessageLambda = this.createLambda(
            'CreateMessage',
            LAMBDA_CREATE_MESSAGE_LOCATION
        )
        const deleteMessageLambda = this.createLambda(
            'DeleteMessage',
            LAMBDA_DELETE_MESSAGE_LOCATION
        )
        const updateMessageLambda = this.createLambda(
            'UpdateMessage',
            LAMBDA_UPDATE_MESSAGE_LOCATION
        )

        /**
         * Register Lambda Function Resolvers to AppSync
         */
        this.registerDataSourceResolver(
            'getMessageByIdLambdaDatasource',
            getMessageByIdLambda,
            'Query',
            'getMessageById'
        )
        this.registerDataSourceResolver(
            'listMessagesLambdaDatasource',
            listMessagesLambda,
            'Query',
            'listMessages'
        )
        this.registerDataSourceResolver(
            'createMessageLambdaDatasource',
            createMessageLambda,
            'Mutation',
            'createMessage'
        )
        this.registerDataSourceResolver(
            'deleteMessageLambdaDatasource',
            deleteMessageLambda,
            'Mutation',
            'deleteMessage'
        )
        this.registerDataSourceResolver(
            'updateMessageLambdaDatasource',
            updateMessageLambda,
            'Mutation',
            'updateMessage'
        )

        // print out the AppSyncApi Id to the terminal
        new cdk.CfnOutput(this, 'AppSyncApiId', {
            value: this.appSyncApi.apiId,
        })
        // print out the AppSyncApi Name to the terminal
        new cdk.CfnOutput(this, 'AppSyncApiName', {
            value: this.appSyncApi.name,
        })
        // print out the AppSync GraphQL endpoint to the terminal
        new cdk.CfnOutput(this, 'GraphQLAPIURL', {
            value: this.appSyncApi.graphqlUrl,
        })
        // print out the AppSync API Key to the terminal
        new cdk.CfnOutput(this, 'GraphQLAPIKey', {
            value: this.appSyncApi.apiKey || '',
        })
        // print out the EventBus Name to the terminal
        new cdk.CfnOutput(this, 'EventBusName', {
            value: this.eventBus.attrName || '',
        })
    }

    createLambda(
        name: string,
        entry: string,
        additionalEnvironmentVariables: { [key: string]: string } = {}
    ): golambda.GoFunction {
        const functionName = name + 'Handler'
        const lambdaFn = new golambda.GoFunction(this, `${name}Handler`, {
            functionName,
            runtime: lambda.Runtime.PROVIDED_AL2,
            entry: entry,
            timeout: cdk.Duration.seconds(29),
            architecture: lambda.Architecture.ARM_64,
            memorySize: 256,
            tracing: lambda.Tracing.ACTIVE,
            environment: {
                MESSAGE_TABLE: this.ddbTable.tableName,
                ...additionalEnvironmentVariables,
            },
        })
        new logs.LogGroup(this, `${name}LogGroup`, {
            logGroupName: `/aws/lambda/${lambdaFn.functionName}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_DAY,
        })
        this.ddbTable.grantFullAccess(lambdaFn)
        return lambdaFn
    }

    registerDataSourceResolver(
        dataSourceId: string,
        lambdaFunction: lambda.IFunction,
        typeName: string,
        fieldName: string
    ): appsync.Resolver {
        return this.appSyncApi
            .addLambdaDataSource(dataSourceId, lambdaFunction)
            .createResolver({
                typeName: typeName,
                fieldName: fieldName,
                requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(
                    '$util.toJson($context.arguments)',
                    'Invoke'
                ),
                responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
            })
    }
}
