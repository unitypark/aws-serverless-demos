package kafka

import (
	"context"
	"sync"

	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	"github.com/deloittepark/cqrs-microservices/reader_service/config"
	"github.com/go-playground/validator"
	"github.com/wvanbergen/kafka/consumergroup"
)

const (
	PoolSize = 30
)

type readerMessageProcessor struct {
	log logger.Logger
	cfg *config.Config
	v   *validator.Validate
}

func NewReaderMessageProcessor(log logger.Logger, cfg *config.Config, v *validator.Validate) *readerMessageProcessor {
	return &readerMessageProcessor{log: log, cfg: cfg, v: v}
}

func (s *readerMessageProcessor) ProcessMessages(ctx context.Context, cg *consumergroup.ConsumerGroup, wg *sync.WaitGroup, workerID int) {
	defer wg.Done()

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		msg := <-cg.Messages()

		s.logProcessMessage(msg, workerID)

		switch msg.Topic {
		case s.cfg.KafkaTopics.TodoCreate.TopicName:
			s.commitMessage(ctx, cg, msg)
		case s.cfg.KafkaTopics.TodoUpdate.TopicName:
			s.commitMessage(ctx, cg, msg)
		case s.cfg.KafkaTopics.TodoDelete.TopicName:
			s.commitMessage(ctx, cg, msg)
		}
	}
}
