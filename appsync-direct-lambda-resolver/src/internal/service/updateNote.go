package service

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/model"
)

type updateNoteRequest struct {
	Payload model.UpdateNotePayload `json:"payload"`
}

func (ns *noteService) UpdateNote(ctx context.Context, request updateNoteRequest) (*model.Note, error) {
	var (
		update = expression.Set(
			expression.Name("name"), expression.Value(request.Payload.Name),
		).Set(
			expression.Name("completed"), expression.Value(request.Payload.Completed),
		)
		expr, _         = expression.NewBuilder().WithUpdate(update).Build()
		updateItemInput = &dynamodb.UpdateItemInput{
			TableName: &ns.config.DbbTableName,
			Key: map[string]types.AttributeValue{
				"id": &types.AttributeValueMemberS{Value: request.Payload.Id},
			},
			ReturnValues:              types.ReturnValueAllNew,
			UpdateExpression:          expr.Update(),
			ExpressionAttributeValues: expr.Values(),
			ExpressionAttributeNames:  expr.Names(),
		}
	)
	output, err := ns.dao.DynamoDBClient.UpdateItem(ctx, updateItemInput)
	if err != nil {
		return nil, err
	}

	createdNote := new(model.Note)
	err = attributevalue.UnmarshalMap(output.Attributes, createdNote)
	if err != nil {
		return nil, err
	}
	return createdNote, nil
}
