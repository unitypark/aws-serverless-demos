import * as cdk from '@aws-cdk/core'
import * as appsync from '@aws-cdk/aws-appsync'
import * as ddb from '@aws-cdk/aws-dynamodb'
import * as golambda from '@aws-cdk/aws-lambda-go'
import * as lambda from '@aws-cdk/aws-lambda'
import * as logs from '@aws-cdk/aws-logs'

const GRAPTHQL_API_PREFIX = '../src/cmd'

const LAMBDA_GET_NOTE_BY_ID_LOCATION = `${GRAPTHQL_API_PREFIX}/getNoteById/main.go`
const LAMBDA_LIST_NOTES_LOCATION = `${GRAPTHQL_API_PREFIX}/listNotes/main.go`
const LAMBDA_CREATE_NOTE_LOCATION = `${GRAPTHQL_API_PREFIX}/createNote/main.go`
const LAMBDA_DELETE_NOTE_LOCATION = `${GRAPTHQL_API_PREFIX}/deleteNote/main.go`
const LAMBDA_UPDATE_NOTE_LOCATION = `${GRAPTHQL_API_PREFIX}/updateNote/main.go`

export class AppsyncGraphqlDynamodbStack extends cdk.Stack {
    private readonly ddbTable: ddb.Table
    private readonly appSyncApi: appsync.GraphqlApi

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        this.appSyncApi = new appsync.GraphqlApi(this, 'Api', {
            name: 'notes-appsync-api',
            schema: appsync.Schema.fromAsset('graphql/schema.graphql'),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: appsync.AuthorizationType.API_KEY,
                    apiKeyConfig: {
                        expires: cdk.Expiration.after(cdk.Duration.days(365)),
                    },
                },
            },
            logConfig: {
                fieldLogLevel: appsync.FieldLogLevel.ERROR,
            },
            xrayEnabled: true,
        })

        // create DynamoDB table
        this.ddbTable = new ddb.Table(this, 'CDKNotesTable', {
            tableName: 'notes-appsync-api-table',
            billingMode: ddb.BillingMode.PROVISIONED,
            partitionKey: {
                name: 'id',
                type: ddb.AttributeType.STRING,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        })

        // create lambda functions
        const getNoteByIdLambda = this.createLambda(
            'GetNoteById',
            LAMBDA_GET_NOTE_BY_ID_LOCATION
        )
        const listNotesLambda = this.createLambda(
            'ListNotes',
            LAMBDA_LIST_NOTES_LOCATION
        )
        const createNoteLambda = this.createLambda(
            'CreateNote',
            LAMBDA_CREATE_NOTE_LOCATION
        )
        const deleteNoteLambda = this.createLambda(
            'DeleteNote',
            LAMBDA_DELETE_NOTE_LOCATION
        )
        const updateNoteLambda = this.createLambda(
            'UpdateNote',
            LAMBDA_UPDATE_NOTE_LOCATION
        )

        this.registerDataSourceResolver(
            'getNoteByIdLambdaDatasource',
            getNoteByIdLambda,
            'Query',
            'getNoteById'
        )
        this.registerDataSourceResolver(
            'listNotesLambdaDatasource',
            listNotesLambda,
            'Query',
            'listNotes'
        )
        this.registerDataSourceResolver(
            'createNoteLambdaDatasource',
            createNoteLambda,
            'Mutation',
            'createNote'
        )
        this.registerDataSourceResolver(
            'deleteNoteLambdaDatasource',
            deleteNoteLambda,
            'Mutation',
            'deleteNote'
        )
        this.registerDataSourceResolver(
            'updateNoteLambdaDatasource',
            updateNoteLambda,
            'Mutation',
            'updateNote'
        )

        // print out the AppSync GraphQL endpoint to the terminal
        new cdk.CfnOutput(this, 'GraphQLAPIURL', {
            value: this.appSyncApi.graphqlUrl,
        })
        // print out the AppSync API Key to the terminal
        new cdk.CfnOutput(this, 'GraphQLAPIKey', {
            value: this.appSyncApi.apiKey || '',
        })
    }

    createLambda(name: string, entry: string): golambda.GoFunction {
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
                NOTES_TABLE: this.ddbTable.tableName,
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
                requestMappingTemplate: appsync.MappingTemplate.lambdaRequest("$util.toJson($context.arguments)", "Invoke"),
                responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
            })
    }
}
