package config

import (
	"errors"
	"os"
)

type Environment string

const (
	Prod    Environment = "production"
	Local   Environment = "local"
	EnvName             = "env"
)

type Config struct {
	Env Environment
}

func New() *Config {
	cfg := new(Config)
	cfg.setEnv()
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
