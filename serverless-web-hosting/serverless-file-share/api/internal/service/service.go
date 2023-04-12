package service

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	appConfig "github.com/deloittepark/serverless-file-share/internal/config"
	"github.com/deloittepark/serverless-file-share/internal/entities"
	"github.com/deloittepark/serverless-file-share/internal/repository"
	"github.com/deloittepark/serverless-file-share/types"
	"go.uber.org/zap"
)

// Service is an interface from which our api module can access our repository of all our models.
type Service interface {
	CreateUrl(urlType, path string, expiringMinutes int) (*entities.Url, error)
	GetUrl(urlType, path string) (*entities.Url, error)
}

type service struct {
	appConfig  *appConfig.Config
	repository repository.DynamoDbRepository
}

// NewFileShareService is used to create a single instance of the service
func NewFileShareService(c *appConfig.Config, r repository.DynamoDbRepository) Service {
	return &service{
		appConfig:  c,
		repository: r,
	}
}

// Url is a service layer that helps create url in DynamoDB Table
func (s *service) CreateUrl(urlType, path string, expiringMinutes int) (*entities.Url, error) {
	if urlType == types.TYPE_DOWNLOAD {
		url, err := s.createPresignedUrl(urlType, path, expiringMinutes)
		if err != nil {
			return nil, err
		}
		urlEntity := new(entities.Url)
		urlEntity.InitNewUrl(urlType, path, *url, expiringMinutes)
		createdUrl, err := s.repository.CreateUrl(urlType, urlEntity)
		zap.L().Debug("returned from CreateUrl", zap.Any("item", createdUrl))
		if err != nil {
			return nil, err
		}
		return createdUrl, nil
	} else if urlType == types.TYPE_UPLOAD {
		return nil, fmt.Errorf("unspported url type")
	} else {
		return nil, fmt.Errorf("unspported url type")
	}
}

// Url is a service layer that helps to retrieve original url from DynamoDB Table
func (s *service) GetUrl(urlType, path string) (*entities.Url, error) {
	url, err := s.repository.GetUrl(urlType, path)
	zap.L().Debug("returned from CreateUrl", zap.Any("item", url))
	if err != nil {
		return nil, err
	}
	return url, nil
}

func (s *service) createPresignedUrl(urlType, path string, expiringMinutes int) (*string, error) {
	zap.L().Debug("creating presigned url")
	cfg, _ := config.LoadDefaultConfig(context.TODO())
	s3Client := s3.NewFromConfig(cfg)
	presigner := s3.NewPresignClient(s3Client)
	res, err := presigner.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: &s.appConfig.FileshareBucketName,
		Key:    &path,
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expiringMinutes * int(time.Minute))
	})
	zap.L().Debug("presigned url", zap.Any("res", res))

	// Create the pre-signed url with an expiry
	if err != nil {
		return nil, fmt.Errorf("failed to generate a pre-signed url: %v", err)
	}
	return &res.URL, nil
}
