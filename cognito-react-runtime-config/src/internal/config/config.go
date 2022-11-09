package config

import (
	"fmt"
	"os"
)

const (
	PROPERTY_RUNTIME_CONFIG_FILE_NAME string = "runtimeConfigFileName"
	PROPERTY_FRONTEND_BUCKET_NAME     string = "frontendBucketName"
	PROPERTY_USERPOOL_ID              string = "userpoolId"
	PROPERTY_APP_CLIENT_ID            string = "appClientId"
)

type Config struct {
	RuntimeConfigFileName string `json:"runtimeConfigFileName"`
	FrontendBucketName    string `json:"frotendBucketName"`
	ReactRuntimeConfig    struct {
		Region      string `json:"region"`
		UserPoolId  string `json:"userPoolId"`
		AppClientId string `json:"appClientId"`
	} `json:"runtimeConfig"`
}

func New() *Config {
	return new(Config)
}

func (c *Config) Init(resourceProperties map[string]interface{}) error {
	var err error
	c.ReactRuntimeConfig.Region = os.Getenv("AWS_REGION")
	c.RuntimeConfigFileName, err = strProperty(resourceProperties, PROPERTY_RUNTIME_CONFIG_FILE_NAME)
	if err != nil {
		return err
	}
	c.FrontendBucketName, err = strProperty(resourceProperties, PROPERTY_FRONTEND_BUCKET_NAME)
	if err != nil {
		return err
	}
	c.ReactRuntimeConfig.UserPoolId, err = strProperty(resourceProperties, PROPERTY_USERPOOL_ID)
	if err != nil {
		return err
	}
	c.ReactRuntimeConfig.AppClientId, err = strProperty(resourceProperties, PROPERTY_APP_CLIENT_ID)
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
