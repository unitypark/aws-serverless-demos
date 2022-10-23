package service

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/model"
)

func (ns *noteService) ListNotes(ctx context.Context) (*[]model.Note, error) {
	var (
		notes     = &[]model.Note{}
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
