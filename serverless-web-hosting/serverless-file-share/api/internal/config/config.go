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
	LocalTableName      = "FileShare"
	LocalBucketName     = "LocalTestBucket"
	DbbTableName        = "URL_TABLE"
	FileshareBucketName = "FILE_SHARE_BUCKET"
	EnvName             = "env"
)

type Config struct {
	Env                 Environment
	DbbTableName        string
	FileshareBucketName string
}

func New() *Config {
	cfg := new(Config)
	cfg.setEnv()
	cfg.DbbTableName = os.Getenv(DbbTableName)
	if len(cfg.DbbTableName) == 0 {
		cfg.DbbTableName = LocalTableName
	}
	cfg.FileshareBucketName = os.Getenv(FileshareBucketName)
	if len(cfg.FileshareBucketName) == 0 {
		cfg.FileshareBucketName = LocalBucketName
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
