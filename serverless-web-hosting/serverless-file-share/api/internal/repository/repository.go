package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/deloittepark/serverless-file-share/internal/client"
	"github.com/deloittepark/serverless-file-share/internal/entities"
	appTypes "github.com/deloittepark/serverless-file-share/types"
	"go.uber.org/zap"
)

const (
	GlobalWriteReadCap    = 10
	PartitionWriteReadCap = 10
)

// Repository interface allows us to access the CRUD Operations in dynamodb.
type DynamoDbRepository interface {
	GetUrl(urlType, path string) (*entities.Url, error)
	CreateUrl(urlType string, entity *entities.Url) (*entities.Url, error)
}

type dynamoDbRepository struct {
	table  *string
	client *dynamodb.Client
}

// NewRepo is the single instance repo that is being created.
func NewRepository(client *client.Client) DynamoDbRepository {
	return &dynamoDbRepository{
		table:  client.Table,
		client: client.DynamoDbClient,
	}
}

func (r *dynamoDbRepository) GetUrl(urlType, path string) (*entities.Url, error) {
	url, err := r.scanUrl(urlType, path)
	if err != nil {
		zap.L().Error("unexpected error during getItem", zap.Error(err))
		return nil, err
	}
	if isUrlValid(url) {
		return url, nil
	} else {
		return nil, errors.New("url is not valid")
	}
}

// CreateUrl is a dynamodb repository that helps to create new url entry
func (r *dynamoDbRepository) CreateUrl(urlType string, entity *entities.Url) (*entities.Url, error) {
	zap.L().Debug("Repository CreateUrl starts process")
	url, err := r.findUrl(urlType, entity.PK)
	if err != nil {
		zap.L().Error("unexpected error during getItem", zap.Error(err))
		return nil, err
	}
	if !isUrlValid(url) {
		zap.L().Debug(fmt.Sprintf("creating new url entity for path: %s", entity.PK))
		var (
			newUrl = new(entities.Url)
			update = expression.Set(
				expression.Name("AccessKey"), expression.Value(entity.AccessKey),
			).Set(
				expression.Name("Filename"), expression.Value(entity.Filename),
			).Set(
				expression.Name("Url"), expression.Value(entity.Url),
			).Set(
				expression.Name("CreatedAt"), expression.Value(entity.CreatedAt),
			).Set(
				expression.Name("ExpiringAt"), expression.Value(entity.ExpiringAt),
			).Set(
				expression.Name("HitCount"), expression.Value(entity.HitCount),
			).Set(
				expression.Name("Type"), expression.Value(urlType),
			).Set(
				expression.Name("State"), expression.Value(entity.State),
			)
			expr, _         = expression.NewBuilder().WithUpdate(update).Build()
			updateItemInput = &dynamodb.UpdateItemInput{
				TableName: r.table,
				Key: map[string]types.AttributeValue{
					appTypes.PK: &types.AttributeValueMemberS{Value: entity.PK},
					appTypes.SK: &types.AttributeValueMemberS{Value: entity.SK},
				},
				ReturnValues:              types.ReturnValueAllNew,
				UpdateExpression:          expr.Update(),
				ExpressionAttributeValues: expr.Values(),
				ExpressionAttributeNames:  expr.Names(),
			}
		)
		updateItemOutput, err := r.client.UpdateItem(context.TODO(), updateItemInput)
		if err != nil {
			return nil, err
		}

		err = attributevalue.UnmarshalMap(updateItemOutput.Attributes, newUrl)
		if err != nil {
			return nil, err
		}
		zap.L().Debug("returning url entity", zap.Any("url", newUrl))
		return newUrl, nil
	}
	zap.L().Debug("returning url entity", zap.Any("url", url))
	return url, nil
}

func (r *dynamoDbRepository) scanUrl(urlType, accessKey string) (*entities.Url, error) {
	zap.L().Debug("call GetItem to check if given url exists in db")
	urls := &[]entities.Url{}
	filter := expression.Name(appTypes.ATTRIBUTE_TYPE).Equal(expression.Value(urlType)).And(
		expression.Name(appTypes.ATTRIBUTE_ACCESS_KEY).Equal(expression.Value(accessKey)),
	)
	expr, _ := expression.NewBuilder().WithFilter(filter).Build()
	scanInput := &dynamodb.ScanInput{
		TableName:                 r.table,
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		FilterExpression:          expr.Filter(),
	}
	scanOutput, err := r.client.Scan(context.TODO(), scanInput)
	if err != nil {
		zap.L().Error("unexpected error during scan item", zap.Error(err))
		return nil, err
	}

	if scanOutput.Count > 0 {
		zap.L().Info("given path exists in db")
		err = attributevalue.UnmarshalListOfMaps(scanOutput.Items, urls)
		if err != nil {
			return nil, err
		}
		zap.L().Info("output is parsed to object", zap.Any("data", urls))
		return &(*urls)[0], nil
	}
	return nil, errors.New("cannot find url with given path")
}

func (r *dynamoDbRepository) findUrl(urlType, path string) (*entities.Url, error) {
	zap.L().Debug("call GetItem to check if given url exists in db")
	urls := &[]entities.Url{}
	keyCondition := expression.Key(appTypes.PK).Equal(expression.Value(path))
	filter := expression.Name(appTypes.ATTRIBUTE_TYPE).Equal(expression.Value(urlType))
	expr, _ := expression.NewBuilder().WithKeyCondition(keyCondition).WithFilter(filter).Build()
	queryInput := &dynamodb.QueryInput{
		TableName:                 r.table,
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		KeyConditionExpression:    expr.KeyCondition(),
		FilterExpression:          expr.Filter(),
		ScanIndexForward:          aws.Bool(false),
		Limit:                     aws.Int32(1),
	}
	queryOutput, err := r.client.Query(context.TODO(), queryInput)
	if err != nil {
		zap.L().Error("unexpected error during getItem", zap.Error(err))
		return nil, err
	}

	if queryOutput.Count > 0 {
		zap.L().Info("given path exists in db")
		err = attributevalue.UnmarshalListOfMaps(queryOutput.Items, urls)
		if err != nil {
			return nil, err
		}
		zap.L().Info("output is parsed to object", zap.Any("data", urls))
		return &(*urls)[0], nil
	}
	return nil, nil
}

func isUrlValid(url *entities.Url) bool {
	if url == nil {
		zap.L().Info("url is not found")
		return false
	}
	if isInThePast(url.ExpiringAt) {
		zap.L().Info("given url is expired")
		return false
	} else {
		if url.HitCount >= 1 {
			zap.L().Info("given url is used")
			return false
		} else {
			zap.L().Info("given url is not used")
			return true
		}
	}
}

func isInThePast(timestamp string) bool {
	t, _ := time.Parse(appTypes.TIME_FORMAT, timestamp)
	return time.Now().UTC().After(t)
}
