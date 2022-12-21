package dto

import "github.com/google/uuid"

type UpdateTodoDto struct {
	ID    uuid.UUID `json:"id" validate:"required,gte=0,lte=255"`
	Title string    `json:"title" validate:"required,gte=0,lte=255"`
}
