package config

import (
	"flag"
	"fmt"
	"os"

	"github.com/deloittepark/cqrs-microservices/pkg/constants"
	kafkaClient "github.com/deloittepark/cqrs-microservices/pkg/kafka"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	"github.com/pkg/errors"
	"github.com/spf13/viper"
)

var configPath string

func init() {
	flag.StringVar(&configPath, "config", "", "Reader microservice config path")
}

type Config struct {
	ServiceName string              `mapstructure:"serviceName"`
	Logger      *logger.Config      `mapstructure:"logger"`
	KafkaTopics KafkaTopics         `mapstructure:"kafkaTopics"`
	Kafka       *kafkaClient.Config `mapstructure:"kafka"`
}

type KafkaTopics struct {
	TodoCreate kafkaClient.TopicConfig `mapstructure:"todoCreate"`
	TodoUpdate kafkaClient.TopicConfig `mapstructure:"todoUpdate"`
	TodoDelete kafkaClient.TopicConfig `mapstructure:"todoDelete"`
}

func InitConfig() (*Config, error) {
	if configPath == "" {
		configPathFromEnv := os.Getenv(constants.ConfigPath)
		if configPathFromEnv != "" {
			configPath = configPathFromEnv
		} else {
			getwd, err := os.Getwd()
			if err != nil {
				return nil, errors.Wrap(err, "os.Getwd")
			}
			configPath = fmt.Sprintf("%s/reader_service/config/config.yaml", getwd)
		}
	}

	cfg := &Config{}

	viper.AddConfigPath(configPath)
	viper.AddConfigPath("/")

	viper.SetConfigName(constants.Config)
	viper.SetConfigType(constants.Yaml)

	if err := viper.ReadInConfig(); err != nil {
		return nil, errors.Wrap(err, "viper.ReadInConfig")
	}

	if err := viper.Unmarshal(cfg); err != nil {
		return nil, errors.Wrap(err, "viper.Unmarshal")
	}
	kafkaBrokers := os.Getenv(constants.KafkaBrokers)
	if kafkaBrokers != "" {
		cfg.Kafka.Brokers = []string{kafkaBrokers}
	}
	zookeepers := os.Getenv(constants.Zookeepers)
	if zookeepers != "" {
		cfg.Kafka.Zookeepers = []string{zookeepers}
	}

	return cfg, nil
}
