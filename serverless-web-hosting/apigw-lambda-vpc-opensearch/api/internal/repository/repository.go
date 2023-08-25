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
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/client"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/entities"
	appTypes "github.com/unitypark/apigw-lambda-vpc-opensearch/api/types"
	"go.uber.org/zap"
)

const (
	ALLOWED_DOWNLOAD_COUNT int = 100
)

type DynamoDbRepository interface {
	GetAssetUrl(accessKey, username string) (*entities.Asset, error)
	CreateAssetUrl(entity *entities.Asset) (*entities.Asset, error)
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

func (r *dynamoDbRepository) GetAssetUrl(accessKey, username string) (*entities.Asset, error) {
	var isAssetDownloadUrlValid bool
	assets, err := r.scanAssetByAccessKey(accessKey)
	if err != nil {
		zap.L().Error("unexpected error during getItem", zap.Error(err))
		return nil, err
	}
	preparedAsset := &(*assets)[len(*assets)-1]
	isAssetDownloadUrlValid = isAssetUrlValid(preparedAsset)
	if len(*assets) >= ALLOWED_DOWNLOAD_COUNT+1 {
		isAssetDownloadUrlValid = false
	}
	if isAssetDownloadUrlValid {
		var (
			currentTime = entities.GetCurrentUTCTime()
			update      = expression.Set(
				expression.Name("AccessKey"), expression.Value(preparedAsset.AccessKey),
			).Set(
				expression.Name("Filename"), expression.Value(preparedAsset.Filename),
			).Set(
				expression.Name("Url"), expression.Value(preparedAsset.Url),
			).Set(
				expression.Name("CreatedAt"), expression.Value(preparedAsset.CreatedAt),
			).Set(
				expression.Name("CreatedBy"), expression.Value(preparedAsset.CreatedBy),
			).Set(
				expression.Name("ExpiringAt"), expression.Value(preparedAsset.ExpiringAt),
			).Set(
				expression.Name("AccessedAt"), expression.Value(currentTime.Format(appTypes.TIME_FORMAT)),
			).Set(
				expression.Name("AccessedBy"), expression.Value(username),
			)
			expr, _         = expression.NewBuilder().WithUpdate(update).Build()
			updateItemInput = &dynamodb.UpdateItemInput{
				TableName: r.table,
				Key: map[string]types.AttributeValue{
					appTypes.PK: &types.AttributeValueMemberS{Value: preparedAsset.PK},
					appTypes.SK: &types.AttributeValueMemberS{Value: entities.GetUlid(currentTime)},
				},
				ReturnValues:              types.ReturnValueAllNew,
				UpdateExpression:          expr.Update(),
				ExpressionAttributeValues: expr.Values(),
				ExpressionAttributeNames:  expr.Names(),
			}
		)
		zap.L().Info("updating hitcount and state of the asset")
		_, err := r.client.UpdateItem(context.TODO(), updateItemInput)
		if err != nil {
			return nil, err
		}
		return preparedAsset, nil
	} else {
		return nil, errors.New("url is not valid")
	}
}

func (r *dynamoDbRepository) CreateAssetUrl(entity *entities.Asset) (*entities.Asset, error) {
	url, err := r.findAsset(entity.PK)
	if err != nil {
		zap.L().Error("unexpected error during getItem", zap.Error(err))
		return nil, err
	}
	if !isAssetUrlValid(url) {
		zap.L().Debug(fmt.Sprintf("creating new asset entity for path: %s", entity.PK))
		var (
			newUrl = new(entities.Asset)
			update = expression.Set(
				expression.Name("AccessKey"), expression.Value(entity.AccessKey),
			).Set(
				expression.Name("Filename"), expression.Value(entity.Filename),
			).Set(
				expression.Name("Url"), expression.Value(entity.Url),
			).Set(
				expression.Name("CreatedAt"), expression.Value(entity.CreatedAt),
			).Set(
				expression.Name("CreatedBy"), expression.Value(entity.CreatedBy),
			).Set(
				expression.Name("ExpiringAt"), expression.Value(entity.ExpiringAt),
			).Set(
				expression.Name("AccessedAt"), expression.Value(entity.AccessedAt),
			).Set(
				expression.Name("AccessedBy"), expression.Value(entity.AccessedBy),
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

func (r *dynamoDbRepository) scanAssetByAccessKey(accessKey string) (*[]entities.Asset, error) {
	zap.L().Debug("call GetItem to check if given url exists in db")
	urls := &[]entities.Asset{}
	filter := expression.Name(appTypes.ATTRIBUTE_ACCESS_KEY).Equal(expression.Value(accessKey))
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
		return urls, nil
	}
	return nil, errors.New("cannot find url with given path")
}

func (r *dynamoDbRepository) findAsset(path string) (*entities.Asset, error) {
	zap.L().Debug("call GetItem to check if given asset exists in db")
	urls := &[]entities.Asset{}
	keyCondition := expression.Key(appTypes.PK).Equal(expression.Value(path))
	filter := expression.Name(appTypes.ATTRIBUTE_ACCESSED_AT).Equal(expression.Value("INIT")).And(
		expression.Name(appTypes.ATTRIBUTE_ACCESSED_BY).Equal(expression.Value("INIT")),
	)
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

func isAssetUrlValid(asset *entities.Asset) bool {
	if asset == nil {
		zap.L().Info("url is not found")
		return false
	}
	if isInThePast(asset.ExpiringAt) {
		zap.L().Info("given url is expired")
		return false
	} else {
		return true
	}
}

func isInThePast(timestamp string) bool {
	t, _ := time.Parse(appTypes.TIME_FORMAT, timestamp)
	return time.Now().UTC().After(t)
}
