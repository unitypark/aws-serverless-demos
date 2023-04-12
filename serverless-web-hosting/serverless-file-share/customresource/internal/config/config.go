package config

import (
	"fmt"
)

const (
	PROPERTY_COGNITO_USERPOOL_ID     string = "userpoolId"
	PROPERTY_USERPOOL_ADMIN_USERNAME string = "userPoolAdminUsername"
	PROPERTY_USERPOOL_ADMIN_PASSWORD string = "userPoolAdminPassword"
)

type Config struct {
	UserPoolId    string `json:"userPoolId"`
	AdminUsername string `json:"adminUsername"`
	AdminPassword string `json:"adminPassword"`
}

func New() *Config {
	return new(Config)
}

func (c *Config) Init(resourceProperties map[string]interface{}) error {
	var err error
	c.UserPoolId, err = strProperty(resourceProperties, PROPERTY_COGNITO_USERPOOL_ID)
	if err != nil {
		return err
	}
	c.AdminUsername, err = strProperty(resourceProperties, PROPERTY_USERPOOL_ADMIN_USERNAME)
	if err != nil {
		return err
	}
	c.AdminPassword, err = strProperty(resourceProperties, PROPERTY_USERPOOL_ADMIN_PASSWORD)
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
