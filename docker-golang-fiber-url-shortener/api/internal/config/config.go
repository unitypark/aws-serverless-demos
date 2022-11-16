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
	LocalTableName = "UrlShortener"
	DbbTableName   = "URL_TABLE"
)

type Config struct {
	Env          Environment
	DbbTableName string
}

func New() *Config {
	cfg := new(Config)
	cfg.setEnv()
	cfg.DbbTableName = os.Getenv(DbbTableName)
	if len(cfg.DbbTableName) == 0 {
		cfg.DbbTableName = LocalTableName
	}
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
