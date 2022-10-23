package config

import (
	"errors"
	"os"
)

type Environment string

const (
	Prod  Environment = "production"
	Local Environment = "local"
)

// List of env vars to set
const (
	LocalTableName = "Employee"
	DbbTableName   = "EMPLOYEE_TABLE"
	EnvName        = "env"
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
	env := os.Getenv(EnvName)
	if len(env) == 0 || env == string(Prod) {
		c.Env = Prod
	} else if env == string(Local) {
		c.Env = Local
	} else {
		panic(errors.New("unsupported environment"))
	}

}
