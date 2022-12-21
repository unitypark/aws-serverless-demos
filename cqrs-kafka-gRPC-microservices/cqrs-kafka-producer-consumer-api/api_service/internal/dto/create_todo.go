package dto

import "github.com/google/uuid"

type CreateTodoDto struct {
	ID    uuid.UUID `json:"id" validate:"required"`
	Title string    `json:"title" validate:"required,gte=0,lte=255"`
}

type CreateTodoResponseDto struct {
	ID uuid.UUID `json:"id" validate:"required"`
}
