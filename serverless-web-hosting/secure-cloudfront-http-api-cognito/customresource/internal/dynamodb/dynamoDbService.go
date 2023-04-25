package dynamodb

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"go.uber.org/zap"
)

var dynamoDBClient *dynamodb.Client

type (
	DynamoDBServiceIface interface {
		BatchWriteItem(input *dynamodb.BatchWriteItemInput) error
	}
	dynamoDBService struct {
		ctx            context.Context
		dynamoDBClient *dynamodb.Client
	}
)

func NewDynamoDBService(ctx context.Context) DynamoDBServiceIface {
	client, err := newClient(ctx)
	if err != nil {
		zap.L().Panic("unexpected error during initializing dynamodb client", zap.Error(err))
	}
	return &dynamoDBService{
		ctx:            ctx,
		dynamoDBClient: client,
	}
}

func newClient(ctx context.Context) (*dynamodb.Client, error) {
	if dynamoDBClient == nil {
		cfg, err := config.LoadDefaultConfig(ctx)
		if err != nil {
			return nil, err
		}
		dynamoDBClient = dynamodb.NewFromConfig(cfg)
	}
	return dynamoDBClient, nil
}
