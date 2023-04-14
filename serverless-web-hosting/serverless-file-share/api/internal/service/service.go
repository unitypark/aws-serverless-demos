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

var (
	s3Client  *s3.Client
	presigner *s3.PresignClient
)

// Service is an interface from which our api module can access our repository of all our models.
type Service interface {
	CreateUrl(urlType, path string, expiringMinutes int) (*entities.Asset, error)
	GetUrl(urlType, path string) (*entities.Asset, error)
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
func (s *service) CreateUrl(urlType, path string, expiringMinutes int) (*entities.Asset, error) {
	if urlType == types.TYPE_DOWNLOAD {
		url, err := s.createS3PresignedUrl(urlType, path, expiringMinutes)
		if err != nil {
			return nil, err
		}
		urlEntity := new(entities.Asset)
		urlEntity.InitNewAsset(urlType, path, *url, expiringMinutes)
		createdAssetUrl, err := s.repository.CreateAssetUrl(urlType, urlEntity)
		zap.L().Debug("returned from CreateAssetUrl", zap.Any("item", createdAssetUrl))
		if err != nil {
			return nil, err
		}
		return createdAssetUrl, nil
	} else if urlType == types.TYPE_UPLOAD {
		return nil, fmt.Errorf("unspported url type")
	} else {
		return nil, fmt.Errorf("unspported url type")
	}
}

// Url is a service layer that helps to retrieve original url from DynamoDB Table
func (s *service) GetUrl(urlType, path string) (*entities.Asset, error) {
	url, err := s.repository.GetAssetUrl(urlType, path)
	zap.L().Debug("returned from GetAssetUrl", zap.Any("item", url))
	if err != nil {
		return nil, err
	}
	return url, nil
}

func (s *service) createS3PresignedUrl(urlType, path string, expiringMinutes int) (*string, error) {
	cfg, _ := config.LoadDefaultConfig(context.TODO())
	if s3Client == nil {
		s3Client = s3.NewFromConfig(cfg)
	}
	if presigner == nil {
		presigner = s3.NewPresignClient(s3Client)
	}
	res, err := presigner.PresignGetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: &s.appConfig.FileshareBucketName,
		Key:    &path,
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expiringMinutes * int(time.Minute))
	})
	zap.L().Debug("presigned url", zap.Any("res", res))

	if err != nil {
		return nil, fmt.Errorf("failed to generate a pre-signed url: %v", err)
	}
	return &res.URL, nil
}
