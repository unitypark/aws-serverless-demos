package service

import (
	"context"

	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/config"
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/dao"
	"github.com/deloittepark/appsync-direct-lambda-resolver/internal/model"
)

type (
	//go:generate go run github.com/maxbrunsfeld/counterfeiter/v6 -generate
	//counterfeiter:generate . NoteServiceIface
	NoteServiceIface interface {
		ListNotes(ctx context.Context) (*[]model.Note, error)
		GetNoteById(ctx context.Context, request getNoteRequest) (*model.Note, error)
		CreateNote(ctx context.Context, request createNoteRequest) (*model.Note, error)
		UpdateNote(ctx context.Context, request updateNoteRequest) (*model.Note, error)
		DeleteNote(ctx context.Context, request deleteNoteRequest) (*model.Note, error)
	}
	noteService struct {
		config *config.Config
		dao    *dao.Dao
	}
)

func New(config *config.Config, dao *dao.Dao) NoteServiceIface {
	return &noteService{
		config: config,
		dao:    dao,
	}
}
