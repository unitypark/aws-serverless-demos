package commands

import (
	"github.com/deloittepark/cqrs-microservices/api_service/internal/dto"
	"github.com/google/uuid"
)

type TodoCommands struct {
	CreateTodo CreateTodoCmdHandler
	UpdateTodo UpdateTodoCmdHandler
	DeleteTodo DeleteTodoCmdHandler
}

func NewTodoCommands(createTodo CreateTodoCmdHandler, updateTodo UpdateTodoCmdHandler, deleteTodo DeleteTodoCmdHandler) *TodoCommands {
	return &TodoCommands{CreateTodo: createTodo, UpdateTodo: updateTodo, DeleteTodo: deleteTodo}
}

type CreateTodoCommand struct {
	CreateDto *dto.CreateTodoDto
}

func NewCreateTodoCommand(createDto *dto.CreateTodoDto) *CreateTodoCommand {
	return &CreateTodoCommand{CreateDto: createDto}
}

type UpdateTodoCommand struct {
	UpdateDto *dto.UpdateTodoDto
}

func NewUpdateTodoCommand(updateDto *dto.UpdateTodoDto) *UpdateTodoCommand {
	return &UpdateTodoCommand{UpdateDto: updateDto}
}

type DeleteTodoCommand struct {
	id uuid.UUID `json:"id" validate:"required"`
}

func NewDeleteTodoCommand(id uuid.UUID) *DeleteTodoCommand {
	return &DeleteTodoCommand{id: id}
}
