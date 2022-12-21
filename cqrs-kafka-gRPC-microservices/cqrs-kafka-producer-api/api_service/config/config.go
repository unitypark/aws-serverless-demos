package config

import (
	"flag"
	"fmt"
	"os"

	"github.com/deloittepark/cqrs-microservices/pkg/constants"
	"github.com/deloittepark/cqrs-microservices/pkg/kafka"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	"github.com/pkg/errors"

	"github.com/spf13/viper"
)

var configPath string

func init() {
	flag.StringVar(&configPath, "config", "", "API Gateway microservice config path")
}

type Config struct {
	ServiceName string         `mapstructure:"serviceName"`
	Logger      *logger.Config `mapstructure:"logger"`
	KafkaTopics KafkaTopics    `mapstructure:"kafkaTopics"`
	Http        Http           `mapstructure:"http"`
	Grpc        Grpc           `mapstructure:"grpc"`
	Kafka       *kafka.Config  `mapstructure:"kafka"`
}

type Http struct {
	Port                string   `mapstructure:"port"`
	Development         bool     `mapstructure:"development"`
	BasePath            string   `mapstructure:"basePath"`
	TodosPath           string   `mapstructure:"todosPath"`
	DebugHeaders        bool     `mapstructure:"debugHeaders"`
	HttpClientDebug     bool     `mapstructure:"httpClientDebug"`
	DebugErrorsResponse bool     `mapstructure:"debugErrorsResponse"`
	IgnoreLogUrls       []string `mapstructure:"ignoreLogUrls"`
}

type Grpc struct {
	ReaderServicePort string `mapstructure:"readerServicePort"`
}

type KafkaTopics struct {
	TodoCreate kafka.TopicConfig `mapstructure:"todoCreate"`
	TodoUpdate kafka.TopicConfig `mapstructure:"todoUpdate"`
	TodoDelete kafka.TopicConfig `mapstructure:"todoDelete"`
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
			configPath = fmt.Sprintf("%s/api_service/config/config.yaml", getwd)
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

	httpPort := os.Getenv(constants.HttpPort)
	if httpPort != "" {
		cfg.Http.Port = httpPort
	}
	kafkaBrokers := os.Getenv(constants.KafkaBrokers)
	if kafkaBrokers != "" {
		cfg.Kafka.Brokers = []string{kafkaBrokers}
	}
	readerServicePort := os.Getenv(constants.ReaderServicePort)
	if readerServicePort != "" {
		cfg.Grpc.ReaderServicePort = readerServicePort
	}

	return cfg, nil
}
