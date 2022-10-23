package service

import (
	"context"
	"errors"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/model"
)

type getNoteRequest struct {
	Id string `json:"id"`
}

func (ns *messageService) GetMessageById(ctx context.Context, request getNoteRequest) (*model.Message, error) {
	var (
		note         = new(model.Message)
		getItemInput = &dynamodb.GetItemInput{
			Key: map[string]types.AttributeValue{
				"id": &types.AttributeValueMemberS{Value: request.Id},
			},
			TableName: &ns.config.DbbTableName,
		}
	)
	output, err := ns.dao.DynamoDBClient.GetItem(ctx, getItemInput)
	if err != nil {
		return nil, err
	}
	if output.Item == nil || len(output.Item) == 0 {
		return nil, errors.New("item not found")
	}

	err = attributevalue.UnmarshalMap(output.Item, note)
	if err != nil {
		return nil, err
	}
	return note, nil
}
