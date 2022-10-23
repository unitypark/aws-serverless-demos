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

type createMessageRequest struct {
	Topic string `json:"topic"`
	Text  string `json:"text"`
}

func (ns *messageService) CreateMessage(ctx context.Context, req createMessageRequest) (*model.Message, error) {
	var (
		currentTime = utilities.GetCurrentUTCTime()
		createdNote = new(model.Message)
		update      = expression.Set(
			expression.Name("text"), expression.Value(req.Text),
		).Set(
			expression.Name("created"), expression.Value(currentTime.Format(utilities.TimeFormat)),
		).Set(
			expression.Name("updated"), expression.Value(currentTime.Format(utilities.TimeFormat)),
		)
		expr, _         = expression.NewBuilder().WithUpdate(update).Build()
		updateItemInput = &dynamodb.UpdateItemInput{
			TableName: &ns.config.DbbTableName,
			Key: map[string]types.AttributeValue{
				"id":    &types.AttributeValueMemberS{Value: utilities.NewUlid(currentTime)},
				"topic": &types.AttributeValueMemberS{Value: req.Topic},
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
