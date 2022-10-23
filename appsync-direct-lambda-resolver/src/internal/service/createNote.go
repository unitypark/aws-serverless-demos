package service

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/model"
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/utilities"
)

type createNoteRequest struct {
	Payload model.CreateNotePayload `json:"payload"`
}

func (ns *noteService) CreateNote(ctx context.Context, request createNoteRequest) (*model.Note, error) {
	var (
		createdNote = new(model.Note)
		update      = expression.Set(
			expression.Name("name"), expression.Value(request.Payload.Name),
		).Set(
			expression.Name("completed"), expression.Value(request.Payload.Completed),
		)
		expr, _         = expression.NewBuilder().WithUpdate(update).Build()
		updateItemInput = &dynamodb.UpdateItemInput{
			TableName: &ns.config.DbbTableName,
			Key: map[string]types.AttributeValue{
				"id": &types.AttributeValueMemberS{Value: utilities.NewUlid()},
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

	err = attributevalue.UnmarshalMap(output.Attributes, createdNote)
	if err != nil {
		return nil, err
	}
	return createdNote, nil
}
