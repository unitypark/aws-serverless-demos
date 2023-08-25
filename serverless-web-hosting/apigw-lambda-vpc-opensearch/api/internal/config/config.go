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
	LocalTableName                  = "FileShare"
	LocalBucketName                 = "LocalTestBucket"
	EnvName                         = "env"
	ENV_URL_TABLE                   = "URL_TABLE"
	ENV_FILE_SHARE_BUCKET           = "FILE_SHARE_BUCKET"
	ENV_JWKS_URL                    = "JWKS_URL"
	ENV_TOKEN_ISSUER                = "ISS"
	ENV_COGNITO_USER_POOL_CLIENT_ID = "COGNITO_USER_POOL_CLIENT_ID"
)

type Config struct {
	Env                 Environment
	DbbTableName        string
	FileshareBucketName string
	JwksUrl             string
	TokenIss            string
	ClientId            string
}

func New() *Config {
	cfg := new(Config)
	cfg.setEnv()
	cfg.DbbTableName = os.Getenv(ENV_URL_TABLE)
	if len(cfg.DbbTableName) == 0 {
		cfg.DbbTableName = LocalTableName
	}
	cfg.FileshareBucketName = os.Getenv(ENV_FILE_SHARE_BUCKET)
	if len(cfg.FileshareBucketName) == 0 {
		cfg.FileshareBucketName = LocalBucketName
	}
	cfg.JwksUrl = os.Getenv(ENV_JWKS_URL)
	cfg.TokenIss = os.Getenv(ENV_TOKEN_ISSUER)
	cfg.ClientId = os.Getenv(ENV_COGNITO_USER_POOL_CLIENT_ID)
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
