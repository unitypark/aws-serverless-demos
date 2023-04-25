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
	LocalTableName                  = "NetworkStation"
	EnvName                         = "env"
	ENV_NETWORK_STATION_TABLE       = "NETWORK_STATION_TABLE"
	ENV_JWKS_URL                    = "JWKS_URL"
	ENV_TOKEN_ISSUER                = "ISS"
	ENV_COGNITO_USER_POOL_CLIENT_ID = "COGNITO_USER_POOL_CLIENT_ID"
	ENV_ADMIN_ROLE_NAME             = "ADMIN_ROLE_NAME"
)

type Config struct {
	Env           Environment
	DbbTableName  string
	JwksUrl       string
	TokenIss      string
	TokenAud      string
	AdminRoleName string
}

func New() *Config {
	cfg := new(Config)
	cfg.setEnv()
	cfg.DbbTableName = os.Getenv(ENV_NETWORK_STATION_TABLE)
	if len(cfg.DbbTableName) == 0 {
		cfg.DbbTableName = LocalTableName
	}
	cfg.JwksUrl = os.Getenv(ENV_JWKS_URL)
	cfg.TokenIss = os.Getenv(ENV_TOKEN_ISSUER)
	cfg.TokenAud = os.Getenv(ENV_COGNITO_USER_POOL_CLIENT_ID)
	cfg.AdminRoleName = os.Getenv(ENV_ADMIN_ROLE_NAME)
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
