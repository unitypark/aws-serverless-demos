package config

import (
	"fmt"
)

const (
	PROPERTY_RUNTIME_CONFIG_FILE_NAME string = "runtimeConfigFileName"
	PROPERTY_FRONTEND_BUCKET_NAME     string = "frontendBucketName"
	PROPERTY_LOADBALANCER_DNS_NAME    string = "loadBalancerDnsName"
)

type Config struct {
	RuntimeConfigFileName string `json:"runtimeConfigFileName"`
	FrontendBucketName    string `json:"frotendBucketName"`
	ReactRuntimeConfig    struct {
		ApiEndpoint string `json:"apiEndpoint"`
	} `json:"runtimeConfig"`
}

func New() *Config {
	return new(Config)
}

func (c *Config) Init(resourceProperties map[string]interface{}) error {
	var err error
	c.RuntimeConfigFileName, err = strProperty(resourceProperties, PROPERTY_RUNTIME_CONFIG_FILE_NAME)
	if err != nil {
		return err
	}
	c.FrontendBucketName, err = strProperty(resourceProperties, PROPERTY_FRONTEND_BUCKET_NAME)
	if err != nil {
		return err
	}
	c.ReactRuntimeConfig.ApiEndpoint, err = strProperty(resourceProperties, PROPERTY_LOADBALANCER_DNS_NAME)
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
