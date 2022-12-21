package kafka

import (
	"github.com/Shopify/sarama"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
)

// NewSyncProducer create new configured kafka SyncProducer
func NewWriter(log logger.Logger, brokersUrl []string) sarama.SyncProducer {
	config := sarama.NewConfig()
	config.Net.WriteTimeout = writerWriteTimeout
	config.Net.ReadTimeout = writerReadTimeout
	config.Producer.Compression = sarama.CompressionSnappy
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Return.Successes = true
	config.Producer.Retry.Max = writerMaxAttempts

	producer, err := sarama.NewSyncProducer(brokersUrl, config)
	if err != nil {
		log.DPanicf("NewWriter: %v", err)
	}

	return producer
}
