package kafka

import (
	"time"

	"github.com/Shopify/sarama"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
)

type Producer interface {
	PublishMessage(topic string, message []byte) error
}

type producer struct {
	log     logger.Logger
	brokers []string
}

// NewProducer create new kafka producer
func NewProducer(log logger.Logger, brokers []string) (*producer, error) {
	return &producer{log: log, brokers: brokers}, nil
}

func (p *producer) PublishMessage(topic string, message []byte) error {
	conn, err := connectProducer(p.brokers)
	if err != nil {
		return err
	}

	defer conn.Close()

	msg := &sarama.ProducerMessage{
		Topic:     topic,
		Value:     sarama.StringEncoder(message),
		Timestamp: time.Now().UTC(),
	}
	p.log.Infof("NewProducer msg: %v", msg)

	partition, offset, err := conn.SendMessage(msg)
	if err != nil {
		return err
	}
	p.log.Infof("Message is stored in topic(%s)/partition(%d)/offset(%d)\n", topic, partition, offset)
	return nil
}

func connectProducer(brokersUrl []string) (sarama.SyncProducer, error) {
	config := sarama.NewConfig()
	config.Net.WriteTimeout = writerWriteTimeout
	config.Net.ReadTimeout = writerReadTimeout
	config.Producer.Compression = sarama.CompressionSnappy
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Return.Successes = true
	config.Producer.Retry.Max = writerMaxAttempts

	conn, err := sarama.NewSyncProducer(brokersUrl, config)
	if err != nil {
		return nil, err
	}

	return conn, nil
}
