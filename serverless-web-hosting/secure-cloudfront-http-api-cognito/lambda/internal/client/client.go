package client

import (
	"context"
	"errors"
	"log"

	appConfig "github.com/unitypark/serverless-web-hosting/lambda/internal/config"
	"go.uber.org/zap"

	goConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

type Client struct {
	DynamoDbClient *dynamodb.Client
	Table          *string
}

var client *Client

// Creates a default dynamoDbClient with given Context
func Connect(config *appConfig.Config) (*Client, error) {
	switch config.Env {
	case appConfig.Prod:
		zap.L().Info("creating dynamodb client for production")
		if client == nil {
			client = new(Client)
			cfg, err := goConfig.LoadDefaultConfig(context.TODO())
			if err != nil {
				log.Panic(err)
			}
			client.DynamoDbClient = dynamodb.NewFromConfig(cfg)
			client.Table = &config.DbbTableName
		}
	case appConfig.Local:
		zap.L().Info("creating dynamodb client for localhost:8000")
		if client == nil {
			client = new(Client)
			cfg, err := goConfig.LoadDefaultConfig(context.TODO())
			if err != nil {
				log.Panic(err)
			}
			client.DynamoDbClient = dynamodb.NewFromConfig(cfg, func(o *dynamodb.Options) {
				o.EndpointResolver = dynamodb.EndpointResolverFromURL("http://localhost:8000")
			})
			client.Table = &config.DbbTableName
		}
	default:
		return nil, errors.New("invalid environment")
	}
	return client, nil
}
