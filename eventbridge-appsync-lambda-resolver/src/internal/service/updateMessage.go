package service

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/model"
	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/utilities"
)

type updateNoteRequest struct {
	Id    string `json:"id"`
	Topic string `json:"topic"`
	Text  string `json:"text"`
}

func (ns *messageService) UpdateMessage(ctx context.Context, request updateNoteRequest) (*model.Message, error) {
	var (
		currentTime = utilities.GetCurrentUTCTime()
		update      = expression.Set(
			expression.Name("text"), expression.Value(request.Text),
		).Set(
			expression.Name("updated"), expression.Value(currentTime.Format(utilities.TimeFormat)),
		)
		expr, _         = expression.NewBuilder().WithUpdate(update).Build()
		updateItemInput = &dynamodb.UpdateItemInput{
			TableName: &ns.config.DbbTableName,
			Key: map[string]types.AttributeValue{
				"id":    &types.AttributeValueMemberS{Value: request.Id},
				"topic": &types.AttributeValueMemberS{Value: request.Topic},
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

	createdNote := new(model.Message)
	err = attributevalue.UnmarshalMap(output.Attributes, createdNote)
	if err != nil {
		return nil, err
	}
	return createdNote, nil
}
