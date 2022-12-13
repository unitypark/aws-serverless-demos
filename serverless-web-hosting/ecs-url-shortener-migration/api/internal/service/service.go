package service

import (
	"github.com/deloittepark/ecs-url-shortener-api/internal/entities"
	"github.com/deloittepark/ecs-url-shortener-api/internal/repository"
	"go.uber.org/zap"
)

// Service is an interface from which our api module can access our repository of all our models.
type Service interface {
	GetAllUrls() (*[]entities.Url, error)
	GenerateUrl(originalUrl *string) (*entities.Url, error)
	GetOriginalUrl(path *string) (*entities.Url, error)
}

type service struct {
	repository repository.DynamoDbRepository
}

// NewUrlService is used to create a single instance of the service
func NewUrlService(r repository.DynamoDbRepository) Service {
	return &service{
		repository: r,
	}
}

// Url is a service layer that helps create url in DynamoDB Table
func (s *service) GenerateUrl(originalUrl *string) (*entities.Url, error) {
	// additional business logic goes here
	urlEntity := new(entities.Url)
	urlEntity.InitNewUrl(originalUrl)

	createdUrl, err := s.repository.CreateUrl(urlEntity)
	zap.L().Debug("returned from CreateUrl", zap.Any("item", createdUrl))

	if err != nil {
		return nil, err
	}
	return createdUrl, nil
}

// Url is a service layer that helps to retrieve original url from DynamoDB Table
func (s *service) GetOriginalUrl(path *string) (*entities.Url, error) {
	// additional business logic goes here
	foundUrl, err := s.repository.GetOriginalUrl(path)
	zap.L().Debug("returned from GetOriginalUrl", zap.Any("item", foundUrl))
	if err != nil {
		return nil, err
	}
	return foundUrl, nil
}

// Url is a service layer that helps to retrieve original url from DynamoDB Table
func (s *service) GetAllUrls() (*[]entities.Url, error) {
	// additional business logic goes here
	foundUrls, err := s.repository.GetUrls()
	zap.L().Debug("returned from GetAllUrls", zap.Any("item", foundUrls))
	if err != nil {
		return nil, err
	}
	return foundUrls, nil
}
