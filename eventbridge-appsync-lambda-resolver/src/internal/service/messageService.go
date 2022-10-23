package service

import (
	"context"

	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/config"
	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/dao"
	"github.com/deloittepark/eventbridge-appsync-lambda-resolver/internal/model"
)

type (
	//go:generate go run github.com/maxbrunsfeld/counterfeiter/v6 -generate
	//counterfeiter:generate . MessageServiceIface
	MessageServiceIface interface {
		ListMessages(ctx context.Context) (*[]model.Message, error)
		GetMessageById(ctx context.Context, req getNoteRequest) (*model.Message, error)
		CreateMessage(ctx context.Context, req createMessageRequest) (*model.Message, error)
		UpdateMessage(ctx context.Context, req updateNoteRequest) (*model.Message, error)
		DeleteMessage(ctx context.Context, req deleteNoteRequest) (*model.Message, error)
	}
	messageService struct {
		config *config.Config
		dao    *dao.Dao
	}
)

func New(config *config.Config, dao *dao.Dao) MessageServiceIface {
	return &messageService{
		config: config,
		dao:    dao,
	}
}
