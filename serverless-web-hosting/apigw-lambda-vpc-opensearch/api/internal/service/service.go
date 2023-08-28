package service

import (
	appConfig "github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/config"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/dto"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/repository"
	"go.uber.org/zap"
)

type OpenSearchService interface {
	GlobalSearch(query string) (*dto.OpenSearchDTO, error)
	IndexSearch(query, index string) (*dto.OpenSearchDTO, error)
}

type openSearchService struct {
	appConfig  *appConfig.Config
	repository repository.OpenSearchRepository
}

func NewOpenSearchService(c *appConfig.Config, r repository.OpenSearchRepository) OpenSearchService {
	return &openSearchService{
		appConfig:  c,
		repository: r,
	}
}

func (s *openSearchService) GlobalSearch(query string) (*dto.OpenSearchDTO, error) {
	zap.L().Debug("OpenSearch Service for GlobalSearch")
	hits, err := s.repository.GetDocuments(query)
	if err != nil {
		return nil, err
	}
	res := dto.ToDto(hits)
	return res, nil
}

func (s *openSearchService) IndexSearch(query, index string) (*dto.OpenSearchDTO, error) {
	zap.L().Info("OpenSearch Service for IndexSearch")
	hits, err := s.repository.GetDocumentsByIndex(query, index)
	if err != nil {
		return nil, err
	}
	res := dto.ToDto(hits)
	return res, nil
}
