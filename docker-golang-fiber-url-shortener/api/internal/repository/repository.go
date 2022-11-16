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
	"github.com/deloittepark/docker-golang-fiber-url-shortener/internal/client"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/internal/entities"
	"go.uber.org/zap"
)

const (
	GlobalWriteReadCap    = 10
	PartitionWriteReadCap = 10
)

// Repository interface allows us to access the CRUD Operations in dynamodb.
type DynamoDbRepository interface {
	Init() error
	GetUrls() (*[]entities.Url, error)
	CreateUrl(url *entities.Url) (*entities.Url, error)
	GetOriginalUrl(path *string) (*entities.Url, error)
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

func (r *dynamoDbRepository) Init() error {
	var create bool
	_, err := r.client.DescribeTable(context.TODO(), &dynamodb.DescribeTableInput{
		TableName: r.table,
	})
	if err != nil {
		if errorToCatch := new(types.ResourceNotFoundException); !errors.As(err, &errorToCatch) {
			zap.L().Error("describe table api call is failed")
			return err
		} else {
			create = true
		}
	}
	if create {
		zap.L().Info(fmt.Sprintf("table %s is not found, new table will be created in local dynamodb", *r.table))
		creteTableOutput, err := r.client.CreateTable(context.TODO(), &dynamodb.CreateTableInput{
			TableName: r.table,
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("ID"),
					AttributeType: types.ScalarAttributeTypeS,
				},
				{
					AttributeName: aws.String("Type"),
					AttributeType: types.ScalarAttributeTypeS,
				},
				{
					AttributeName: aws.String("State"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("ID"),
					KeyType:       types.KeyTypeHash,
				},
			},
			GlobalSecondaryIndexes: []types.GlobalSecondaryIndex{
				{
					IndexName: aws.String("Entities"),
					KeySchema: []types.KeySchemaElement{
						{
							AttributeName: aws.String("Type"),
							KeyType:       types.KeyTypeHash,
						},
						{
							AttributeName: aws.String("State"),
							KeyType:       types.KeyTypeRange,
						},
					},
					Projection: &types.Projection{
						ProjectionType: types.ProjectionTypeAll,
					},
					ProvisionedThroughput: &types.ProvisionedThroughput{
						ReadCapacityUnits:  aws.Int64(GlobalWriteReadCap),
						WriteCapacityUnits: aws.Int64(GlobalWriteReadCap),
					},
				},
			},
			ProvisionedThroughput: &types.ProvisionedThroughput{
				ReadCapacityUnits:  aws.Int64(PartitionWriteReadCap),
				WriteCapacityUnits: aws.Int64(PartitionWriteReadCap),
			},
			BillingMode: types.BillingModeProvisioned,
		})
		if err != nil {
			zap.L().Error("create table failed")
			return err
		}
		zap.L().Debug("create table output", zap.Any("output", creteTableOutput))

		w := dynamodb.NewTableExistsWaiter(r.client)
		err = w.Wait(context.Background(),
			&dynamodb.DescribeTableInput{
				TableName: r.table,
			},
			2*time.Minute,
			func(o *dynamodb.TableExistsWaiterOptions) {
				o.MaxDelay = 5 * time.Second
				o.MinDelay = 5 * time.Second
			})
		if err != nil {
			zap.L().Error("timed out while waiting for table to become active")
			return err
		}
	}
	return nil
}

func (r *dynamoDbRepository) GetUrls() (*[]entities.Url, error) {
	zap.L().Debug("Repository GetUrls starts process")
	urls := new([]entities.Url)
	scanInput := &dynamodb.ScanInput{
		TableName: r.table,
	}
	output, err := r.client.Scan(context.TODO(), scanInput)
	if err != nil {
		return nil, err
	}
	err = attributevalue.UnmarshalListOfMaps(output.Items, urls)
	if err != nil {
		return nil, err
	}
	return urls, nil
}

func (r *dynamoDbRepository) GetOriginalUrl(path *string) (*entities.Url, error) {
	zap.L().Debug("Repository GetOriginalUrl starts process")
	var (
		url          = new(entities.Url)
		keyCondition = expression.KeyAnd(
			expression.Key(entities.GSI_PK).Equal(expression.Value(entities.Type)),
			expression.Key(entities.GSI_SK).Equal(expression.Value(entities.STATE_ACTVE)),
		)
		filterExpr = expression.Equal(expression.Name("Path"), expression.Value(path))
		expr, _    = expression.NewBuilder().WithKeyCondition(keyCondition).WithFilter(filterExpr).Build()
	)

	queryInput := &dynamodb.QueryInput{
		TableName:                 r.table,
		IndexName:                 aws.String(entities.GSI_INDEX),
		ExpressionAttributeNames:  expr.Names(),
		ExpressionAttributeValues: expr.Values(),
		KeyConditionExpression:    expr.KeyCondition(),
		FilterExpression:          expr.Filter(),
	}

	output, err := r.client.Query(context.TODO(), queryInput)
	if err != nil {
		return nil, err
	}

	err = attributevalue.UnmarshalMap(output.Items[0], url)
	if err != nil {
		return nil, err
	}
	zap.L().Debug("updating hitcount", zap.Any("url", url.OriginalUrl))
	r.updateHitCount(url)
	return url, nil
}

// CreateUrl is a dynamodb repository that helps to create new url entry
func (r *dynamoDbRepository) CreateUrl(entity *entities.Url) (*entities.Url, error) {
	zap.L().Debug("Repository CreateUrl starts process")
	var (
		item   = new(entities.Url)
		update = expression.Set(
			expression.Name("OriginalUrl"), expression.Value(entity.OriginalUrl),
		).Set(
			expression.Name("Path"), expression.Value(entity.Path),
		).Set(
			expression.Name("CreatedAt"), expression.Value(entity.CreatedAt),
		).Set(
			expression.Name("HitCount"), expression.Value(entity.HitCount),
		).Set(
			expression.Name("Type"), expression.Value(entity.Type),
		).Set(
			expression.Name("State"), expression.Value(entity.State),
		)
		expr, _         = expression.NewBuilder().WithUpdate(update).Build()
		updateItemInput = &dynamodb.UpdateItemInput{
			TableName: r.table,
			Key: map[string]types.AttributeValue{
				entities.PK: &types.AttributeValueMemberS{Value: entity.Id},
			},
			ReturnValues:              types.ReturnValueAllNew,
			UpdateExpression:          expr.Update(),
			ExpressionAttributeValues: expr.Values(),
			ExpressionAttributeNames:  expr.Names(),
		}
	)
	output, err := r.client.UpdateItem(context.TODO(), updateItemInput)
	if err != nil {
		return nil, err
	}

	err = attributevalue.UnmarshalMap(output.Attributes, item)
	if err != nil {
		return nil, err
	}
	return item, nil
}

func (r *dynamoDbRepository) updateHitCount(entity *entities.Url) {
	zap.L().Debug("Repository updateHitCount starts process")
	var (
		update = expression.Set(
			expression.Name("HitCount"), expression.Value(entity.HitCount+1),
		)
		expr, _         = expression.NewBuilder().WithUpdate(update).Build()
		updateItemInput = &dynamodb.UpdateItemInput{
			TableName: r.table,
			Key: map[string]types.AttributeValue{
				entities.PK: &types.AttributeValueMemberS{Value: entity.Id},
			},
			ReturnValues:              types.ReturnValueAllNew,
			UpdateExpression:          expr.Update(),
			ExpressionAttributeValues: expr.Values(),
			ExpressionAttributeNames:  expr.Names(),
		}
	)
	_, err := r.client.UpdateItem(context.TODO(), updateItemInput)
	if err != nil {
		zap.L().Error("unexpected error during updating hitcount", zap.Error(err))
	}
}
