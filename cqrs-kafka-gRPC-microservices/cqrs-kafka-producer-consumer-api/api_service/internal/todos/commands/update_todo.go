package commands

import (
	"context"

	"github.com/deloittepark/cqrs-microservices/api_service/config"
	kafkaClient "github.com/deloittepark/cqrs-microservices/pkg/kafka"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	kafkaMessages "github.com/deloittepark/cqrs-microservices/proto/kafka"
	"google.golang.org/protobuf/proto"
)

type UpdateTodoCmdHandler interface {
	Handle(ctx context.Context, command *UpdateTodoCommand) error
}

type updateTodoCmdHandler struct {
	log           logger.Logger
	cfg           *config.Config
	kafkaProducer kafkaClient.Producer
}

func NewUpdateTodoHandler(log logger.Logger, cfg *config.Config, kafkaProducer kafkaClient.Producer) *updateTodoCmdHandler {
	return &updateTodoCmdHandler{log: log, cfg: cfg, kafkaProducer: kafkaProducer}
}

func (c *updateTodoCmdHandler) Handle(ctx context.Context, command *UpdateTodoCommand) error {
	updateDto := &kafkaMessages.TodoUpdate{
		ID:    command.UpdateDto.ID.String(),
		Title: command.UpdateDto.Title,
	}

	dtoBytes, err := proto.Marshal(updateDto)
	if err != nil {
		return err
	}

	return c.kafkaProducer.PublishMessage(c.cfg.KafkaTopics.TodoUpdate.TopicName, dtoBytes)
}
