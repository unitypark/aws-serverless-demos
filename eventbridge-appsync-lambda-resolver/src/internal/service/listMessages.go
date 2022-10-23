package service

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/model"
)

func (ns *messageService) ListMessages(ctx context.Context) (*[]model.Message, error) {
	var (
		notes     = &[]model.Message{}
		scanInput = &dynamodb.ScanInput{
			TableName: &ns.config.DbbTableName,
		}
	)
	output, err := ns.dao.DynamoDBClient.Scan(ctx, scanInput)
	if err != nil {
		return nil, err
	}
	if output.Items == nil || len(output.Items) == 0 {
		return notes, nil
	}

	err = attributevalue.UnmarshalListOfMaps(output.Items, notes)
	if err != nil {
		return nil, err
	}
	return notes, nil
}
