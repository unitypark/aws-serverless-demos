package kafka

import (
	"time"

	"github.com/Shopify/sarama"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
)

type Producer interface {
	PublishMessage(topic string, message []byte) error
	Close() error
}

type producer struct {
	log     logger.Logger
	brokers []string
	sp      sarama.SyncProducer
}

// NewProducer create new kafka producer
func NewProducer(log logger.Logger, brokers []string) *producer {
	return &producer{log: log, brokers: brokers, sp: NewWriter(log, brokers)}
}

func (p *producer) PublishMessage(topic string, message []byte) error {
	msg := &sarama.ProducerMessage{
		Topic:     topic,
		Value:     sarama.StringEncoder(message),
		Timestamp: time.Now().UTC(),
	}

	partition, offset, err := p.sp.SendMessage(msg)
	if err != nil {
		return err
	}
	p.log.Infof("Message is stored in topic(%s)/partition(%d)/offset(%d)\n", topic, partition, offset)
	return nil
}

func (p *producer) Close() error {
	return p.sp.Close()
}
