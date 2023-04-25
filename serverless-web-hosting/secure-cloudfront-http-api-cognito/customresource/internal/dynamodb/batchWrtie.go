package dynamodb

import "github.com/aws/aws-sdk-go-v2/service/dynamodb"

func (dbs *dynamoDBService) BatchWriteItem(input *dynamodb.BatchWriteItemInput) error {
	_, err := dbs.dynamoDBClient.BatchWriteItem(dbs.ctx, input)
	return err
}
