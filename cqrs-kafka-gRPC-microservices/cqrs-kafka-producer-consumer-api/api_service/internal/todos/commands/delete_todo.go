package commands

import (
	"context"

	"github.com/deloittepark/cqrs-microservices/api_service/config"
	kafkaClient "github.com/deloittepark/cqrs-microservices/pkg/kafka"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	kafkaMessages "github.com/deloittepark/cqrs-microservices/proto/kafka"
	"google.golang.org/protobuf/proto"
)

type DeleteTodoCmdHandler interface {
	Handle(ctx context.Context, command *DeleteTodoCommand) error
}

type deleteTodoHandler struct {
	log           logger.Logger
	cfg           *config.Config
	kafkaProducer kafkaClient.Producer
}

func NewDeleteTodoHandler(log logger.Logger, cfg *config.Config, kafkaProducer kafkaClient.Producer) *deleteTodoHandler {
	return &deleteTodoHandler{log: log, cfg: cfg, kafkaProducer: kafkaProducer}
}

func (c *deleteTodoHandler) Handle(ctx context.Context, command *DeleteTodoCommand) error {
	createDto := &kafkaMessages.TodoDelete{ID: command.id.String()}

	dtoBytes, err := proto.Marshal(createDto)
	if err != nil {
		return err
	}

	return c.kafkaProducer.PublishMessage(c.cfg.KafkaTopics.TodoDelete.TopicName, dtoBytes)
}
