package config

import (
	"os"
)

type Environment string

const (
	Prod  Environment = "production"
	Local Environment = "local"
)

// List of env vars to set
const (
	EnvName                             = "env"
	ENV_OPENSEARCH_ENDPOINT             = "OPENSEARCH_ENDPOINT"
	ENV_OPENSEARCH_MASTER_USERNAME      = "OPENSEARCH_MASTER_USERNAME"
	ENV_OPENSEARCH_MASTER_USER_PASSWORD = "OPENSEARCH_MASTER_USER_PASSWORD"
)

type Config struct {
	Env                          Environment
	OpenSearchEndpoint           string
	OpenSearchMasterUsername     string
	OpenSearchMasterUserPassword string
}

func New() *Config {
	cfg := new(Config)
	cfg.setEnv()
	cfg.OpenSearchEndpoint = os.Getenv(ENV_OPENSEARCH_ENDPOINT)
	cfg.OpenSearchMasterUsername = os.Getenv(ENV_OPENSEARCH_MASTER_USERNAME)
	cfg.OpenSearchMasterUserPassword = os.Getenv(ENV_OPENSEARCH_MASTER_USER_PASSWORD)
	return cfg
}

func (c *Config) setEnv() {
	if inLambda() {
		c.Env = Prod
	} else {
		c.Env = Local
	}
}

func inLambda() bool {
	if lambdaTaskRoot := os.Getenv("LAMBDA_TASK_ROOT"); lambdaTaskRoot != "" {
		return true
	}
	return false
}
