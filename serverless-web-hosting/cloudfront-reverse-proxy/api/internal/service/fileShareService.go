package service

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	appConfig "github.com/unitypark/cloudfront-reverse-proxy/api/internal/config"
	"github.com/unitypark/cloudfront-reverse-proxy/api/internal/entities"
	"github.com/unitypark/cloudfront-reverse-proxy/api/internal/repository"
	"go.uber.org/zap"
)

var (
	s3Client  *s3.Client
	presigner *s3.PresignClient
)

// Service is an interface from which our api module can access our repository of all our models.
type FileShareService interface {
	CreateUploadUrl(path, username string, expiringMinutes int) (*entities.Asset, error)
	CreateDownloadUrl(path, username string, expiringMinutes int) (*entities.Asset, error)
	GetUrl(accessKey, username string) (*entities.Asset, error)
}

type fileShareService struct {
	appConfig  *appConfig.Config
	repository repository.DynamoDbRepository
}

// NewFileShareService is used to create a single instance of the service
func NewFileShareService(c *appConfig.Config, r repository.DynamoDbRepository) FileShareService {
	return &fileShareService{
		appConfig:  c,
		repository: r,
	}
}

func (s *fileShareService) CreateUploadUrl(path, username string, expiringMinutes int) (*entities.Asset, error) {
	url, err := s.createS3PresignedPostUrl(path, expiringMinutes)
	if err != nil {
		return nil, err
	}
	asset := new(entities.Asset)
	asset.InitNewUploadAsset(path, *url, username, expiringMinutes)
	return asset, nil
}

func (s *fileShareService) CreateDownloadUrl(path, username string, expiringMinutes int) (*entities.Asset, error) {
	url, err := s.createS3PresignedGetUrl(path, expiringMinutes)
	if err != nil {
		return nil, err
	}
	asset := new(entities.Asset)
	asset.InitNewDownloadAsset(path, *url, username, expiringMinutes)
	createdAsset, err := s.repository.CreateAssetUrl(asset)
	zap.L().Debug("returned from CreateAssetUrl", zap.Any("item", createdAsset))
	if err != nil {
		return nil, err
	}
	return createdAsset, nil
}

func (s *fileShareService) GetUrl(accessKey, username string) (*entities.Asset, error) {
	url, err := s.repository.GetAssetUrl(accessKey, username)
	zap.L().Debug("returned from GetAssetUrl", zap.Any("item", url))
	if err != nil {
		return nil, err
	}
	return url, nil
}

func (s *fileShareService) createS3PresignedGetUrl(path string, expiringMinutes int) (*string, error) {
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

func (s *fileShareService) createS3PresignedPostUrl(path string, expiringMinutes int) (*string, error) {
	cfg, _ := config.LoadDefaultConfig(context.TODO())
	if s3Client == nil {
		s3Client = s3.NewFromConfig(cfg)
	}
	if presigner == nil {
		presigner = s3.NewPresignClient(s3Client)
	}
	res, err := presigner.PresignPutObject(context.TODO(), &s3.PutObjectInput{
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
