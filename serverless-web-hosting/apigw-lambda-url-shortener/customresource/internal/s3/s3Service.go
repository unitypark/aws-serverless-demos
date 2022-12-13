package s3

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"go.uber.org/zap"
)

var s3Client *s3.Client
var uploadManager *manager.Uploader

type (
	S3ServiceIface interface {
		Upload(input *s3.PutObjectInput) (*string, error)
		Delete(input *s3.DeleteObjectInput) (*string, error)
	}
	s3Service struct {
		ctx      context.Context
		s3Client *s3.Client
	}
)

func NewS3Service(ctx context.Context) S3ServiceIface {
	client, err := newClient(ctx)
	if err != nil {
		zap.L().Panic("unexpected error during initializing s3 client", zap.Error(err))
	}
	return &s3Service{
		ctx:      ctx,
		s3Client: client,
	}
}

func (s3s *s3Service) getUploadManager() *manager.Uploader {
	if uploadManager == nil {
		uploadManager = manager.NewUploader(s3s.s3Client)
	}
	return uploadManager
}

func newClient(ctx context.Context) (*s3.Client, error) {
	if s3Client == nil {
		cfg, err := config.LoadDefaultConfig(ctx)
		if err != nil {
			return nil, err
		}
		s3Client = s3.NewFromConfig(cfg)
	}
	return s3Client, nil
}
