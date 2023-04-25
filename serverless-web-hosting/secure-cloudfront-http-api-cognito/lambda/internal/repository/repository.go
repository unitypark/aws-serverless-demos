package repository

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/unitypark/serverless-web-hosting/lambda/internal/client"
	"github.com/unitypark/serverless-web-hosting/lambda/internal/entities"
	"go.uber.org/zap"
)

type DynamoDbRepository interface {
	ScanNetworkStations() (*[]entities.NetworkStation, error)
}

type dynamoDbRepository struct {
	table  *string
	client *dynamodb.Client
}

func NewRepository(client *client.Client) DynamoDbRepository {
	return &dynamoDbRepository{
		table:  client.Table,
		client: client.DynamoDbClient,
	}
}

func (r *dynamoDbRepository) ScanNetworkStations() (*[]entities.NetworkStation, error) {
	zap.L().Debug("call Scan to find all network stations")
	networkStations := &[]entities.NetworkStation{}
	expr, _ := expression.NewBuilder().Build()
	scanInput := &dynamodb.ScanInput{
		TableName:                 r.table,
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
	}
	scanOutput, err := r.client.Scan(context.TODO(), scanInput)
	if err != nil {
		zap.L().Error("unexpected error during scan item", zap.Error(err))
		return nil, err
	}

	err = attributevalue.UnmarshalListOfMaps(scanOutput.Items, networkStations)
	if err != nil {
		return nil, err
	}
	zap.L().Info("output is parsed to object", zap.Any("data", networkStations))
	return networkStations, nil
}
