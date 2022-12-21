package service

import (
	"github.com/deloittepark/cqrs-microservices/api_service/config"
	"github.com/deloittepark/cqrs-microservices/api_service/internal/todos/commands"
	"github.com/deloittepark/cqrs-microservices/pkg/kafka"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
)

type TodoService struct {
	Commands *commands.TodoCommands
	//Queries  *queries.TodoQueries
}

func NewTodoService(log logger.Logger, cfg *config.Config, kafkaProducer kafka.Producer) *TodoService {

	createTodoHandler := commands.NewCreateTodoHandler(log, cfg, kafkaProducer)
	updateTodoHandler := commands.NewUpdateTodoHandler(log, cfg, kafkaProducer)
	deleteTodoHandler := commands.NewDeleteTodoHandler(log, cfg, kafkaProducer)

	/* 	getTodoByIdHandler := queries.NewGetTodoByIdHandler(log, cfg, rsClient)
	   	searchTodoHandler := queries.NewSearchTodoHandler(log, cfg, rsClient) */

	TodoCommands := commands.NewTodoCommands(createTodoHandler, updateTodoHandler, deleteTodoHandler)
	// TodoQueries := queries.NewTodoQueries(getTodoByIdHandler, searchTodoHandler)

	return &TodoService{Commands: TodoCommands}
}
