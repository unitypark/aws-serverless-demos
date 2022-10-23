package config

import (
	"os"
)

// List of env vars to set
const (
	DbbTableName = "NOTES_TABLE"
)

type Config struct {
	DbbTableName string
}

func New() *Config {
	cfg := new(Config)
	cfg.DbbTableName = cfg.readEnv(DbbTableName)
	return cfg
}

func (c *Config) readEnv(key string) string {
	v := os.Getenv(key)
	return v
}
