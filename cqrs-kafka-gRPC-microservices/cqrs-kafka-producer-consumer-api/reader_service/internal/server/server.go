package server

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	kafkaClient "github.com/deloittepark/cqrs-microservices/pkg/kafka"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	"github.com/deloittepark/cqrs-microservices/reader_service/config"
	readerKafka "github.com/deloittepark/cqrs-microservices/reader_service/internal/product/delivery/kafka"
	"github.com/go-playground/validator"
)

type server struct {
	log logger.Logger
	cfg *config.Config
	v   *validator.Validate
}

func NewServer(log logger.Logger, cfg *config.Config) *server {
	return &server{log: log, cfg: cfg, v: validator.New()}
}

func (s *server) Run() error {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM, syscall.SIGINT)
	defer cancel()

	readerMessageProcessor := readerKafka.NewReaderMessageProcessor(s.log, s.cfg, s.v)

	s.log.Infof("Starting Reader Kafka consumers Brokers: %v, Zookeepers: %v", s.cfg.Kafka.Brokers, s.cfg.Kafka.Zookeepers)
	cg := kafkaClient.NewConsumerGroup(s.cfg.Kafka.Brokers, s.cfg.Kafka.Zookeepers, s.cfg.Kafka.GroupID, s.log)

	go cg.ConsumeTopic(ctx, s.getConsumerGroupTopics(), readerKafka.PoolSize, readerMessageProcessor.ProcessMessages)

	<-ctx.Done()
	return nil
}
