package kafka

import (
	"context"

	"github.com/Shopify/sarama"
)

// NewKafkaClient create new kafka client
func NewKafkaClient(ctx context.Context, kafkaCfg *Config) (sarama.Client, error) {
	return sarama.NewClient(kafkaCfg.Brokers, sarama.NewConfig())
}
