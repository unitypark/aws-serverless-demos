package service

import (
	"context"

	"github.com/aws/aws-lambda-go/cfn"
	"github.com/aws/aws-lambda-go/lambdacontext"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/unitypark/secure-cloudfront-http-api-cognito/customresource/internal/config"
	dynamodbService "github.com/unitypark/secure-cloudfront-http-api-cognito/customresource/internal/dynamodb"
)

type (
	OnEventServiceIface interface {
		OnCreateEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error)
	}
	onEventService struct {
		config          *config.Config
		dynamoDBService dynamodbService.DynamoDBServiceIface
	}
)

func NewOnEventService(config *config.Config, dynamoDBService dynamodbService.DynamoDBServiceIface) OnEventServiceIface {
	return &onEventService{
		config:          config,
		dynamoDBService: dynamoDBService,
	}
}

func (crs *onEventService) OnCreateEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error) {
	err = crs.config.Init(event.ResourceProperties)
	if err != nil {
		return
	}
	putItemsInput := generateBatchWriteItemInput(crs.config.DynamoDBTableName)
	crs.dynamoDBService.BatchWriteItem(putItemsInput)
	if err != nil {
		return
	}
	physicalResourceID = lambdacontext.LogStreamName
	return
}

func generateBatchWriteItemInput(tableName string) *dynamodb.BatchWriteItemInput {
	return &dynamodb.BatchWriteItemInput{
		RequestItems: map[string][]types.WriteRequest{
			tableName: {
				{
					PutRequest: &types.PutRequest{
						Item: map[string]types.AttributeValue{
							"ID":        &types.AttributeValueMemberS{Value: "STATION#1"},
							"Latitude":  &types.AttributeValueMemberN{Value: "0"},
							"Longitude": &types.AttributeValueMemberN{Value: "0"},
							"Reach":     &types.AttributeValueMemberN{Value: "9"},
						},
					},
				},
				{
					PutRequest: &types.PutRequest{
						Item: map[string]types.AttributeValue{
							"ID":        &types.AttributeValueMemberS{Value: "STATION#2"},
							"Latitude":  &types.AttributeValueMemberN{Value: "20"},
							"Longitude": &types.AttributeValueMemberN{Value: "20"},
							"Reach":     &types.AttributeValueMemberN{Value: "6"},
						},
					},
				},
				{
					PutRequest: &types.PutRequest{
						Item: map[string]types.AttributeValue{
							"ID":        &types.AttributeValueMemberS{Value: "STATION#3"},
							"Latitude":  &types.AttributeValueMemberN{Value: "10"},
							"Longitude": &types.AttributeValueMemberN{Value: "0"},
							"Reach":     &types.AttributeValueMemberN{Value: "12"},
						},
					},
				},
				{
					PutRequest: &types.PutRequest{
						Item: map[string]types.AttributeValue{
							"ID":        &types.AttributeValueMemberS{Value: "STATION#4"},
							"Latitude":  &types.AttributeValueMemberN{Value: "5"},
							"Longitude": &types.AttributeValueMemberN{Value: "5"},
							"Reach":     &types.AttributeValueMemberN{Value: "13"},
						},
					},
				},
				{
					PutRequest: &types.PutRequest{
						Item: map[string]types.AttributeValue{
							"ID":        &types.AttributeValueMemberS{Value: "STATION#5"},
							"Latitude":  &types.AttributeValueMemberN{Value: "99"},
							"Longitude": &types.AttributeValueMemberN{Value: "25"},
							"Reach":     &types.AttributeValueMemberN{Value: "2"},
						},
					},
				},
			},
		},
	}
}
