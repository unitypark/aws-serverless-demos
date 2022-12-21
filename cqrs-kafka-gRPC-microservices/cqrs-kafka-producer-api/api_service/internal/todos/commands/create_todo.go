package commands

import (
	"context"

	"github.com/deloittepark/cqrs-microservices/api_service/config"
	kafkaClient "github.com/deloittepark/cqrs-microservices/pkg/kafka"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	kafkaMessages "github.com/deloittepark/cqrs-microservices/proto/kafka"
	"google.golang.org/protobuf/proto"
)

type CreateTodoCmdHandler interface {
	Handle(ctx context.Context, command *CreateTodoCommand) error
}

type createTodoHandler struct {
	log           logger.Logger
	cfg           *config.Config
	kafkaProducer kafkaClient.Producer
}

func NewCreateTodoHandler(log logger.Logger, cfg *config.Config, kafkaProducer kafkaClient.Producer) *createTodoHandler {
	return &createTodoHandler{log: log, cfg: cfg, kafkaProducer: kafkaProducer}
}

func (c *createTodoHandler) Handle(ctx context.Context, command *CreateTodoCommand) error {
	createDto := &kafkaMessages.TodoCreate{
		ID:    command.CreateDto.ID.String(),
		Title: command.CreateDto.Title,
	}

	dtoBytes, err := proto.Marshal(createDto)
	if err != nil {
		return err
	}

	return c.kafkaProducer.PublishMessage(c.cfg.KafkaTopics.TodoCreate.TopicName, dtoBytes)
}
