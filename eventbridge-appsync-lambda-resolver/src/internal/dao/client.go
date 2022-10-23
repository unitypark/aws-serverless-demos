package dao

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"go.uber.org/zap"
)

var dynamoDBClient *dynamodb.Client

type Dao struct {
	DynamoDBClient *dynamodb.Client
}

func New() *Dao {
	if dynamoDBClient == nil {
		zap.L().Info("creating new dynamoDB client for Production")
		cfg, err := config.LoadDefaultConfig(context.TODO())
		if err != nil {
			zap.L().Panic("failed to initilize a dynamoDB client", zap.Error(err))
		}
		dynamoDBClient = dynamodb.NewFromConfig(cfg)
	}
	return &Dao{
		DynamoDBClient: dynamoDBClient,
	}
}
