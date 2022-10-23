package service

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/model"
)

type deleteNoteRequest struct {
	Id string `json:"noteId"`
}

func (ns *noteService) DeleteNote(ctx context.Context, request deleteNoteRequest) (*model.Note, error) {
	var (
		deletedNote     = new(model.Note)
		deleteItemInput = &dynamodb.DeleteItemInput{
			Key: map[string]types.AttributeValue{
				"id": &types.AttributeValueMemberS{Value: request.Id},
			},
			TableName:    &ns.config.DbbTableName,
			ReturnValues: types.ReturnValueAllOld,
		}
	)
	output, err := ns.dao.DynamoDBClient.DeleteItem(ctx, deleteItemInput)
	if err != nil {
		return nil, err
	}

	err = attributevalue.UnmarshalMap(output.Attributes, deletedNote)
	if err != nil {
		return nil, err
	}
	return deletedNote, nil
}
