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
	cfg.DbbTableName = os.Getenv(DbbTableName)
	if len(cfg.DbbTableName) == 0 {
		cfg.DbbTableName = LocalTableName
		cfg.Env = Local
	} else {
		cfg.Env = Prod
	}
	return cfg
}
