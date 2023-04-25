package config

import (
	"fmt"
)

const (
	PROPERTY_DYNAMO_DB_TABLE_NAME string = "dynamoDbTableName"
)

type Config struct {
	DynamoDBTableName string `json:"dynmodbTable"`
}

func New() *Config {
	properties := new(Config)
	return properties
}

func (ppts *Config) Init(resourceProperties map[string]interface{}) error {
	var err error
	ppts.DynamoDBTableName, err = strProperty(resourceProperties, PROPERTY_DYNAMO_DB_TABLE_NAME)
	if err != nil {
		return err
	}
	return nil
}

func strProperty(ResourceProperties map[string]interface{}, propertyName string) (string, error) {
	if val, ok := ResourceProperties[propertyName]; ok {
		return val.(string), nil
	}
	return "", fmt.Errorf("missing property %s", propertyName)
}
