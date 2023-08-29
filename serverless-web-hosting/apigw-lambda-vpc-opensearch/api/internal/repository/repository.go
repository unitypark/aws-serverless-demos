package repository

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/opensearch-project/opensearch-go/v2"
	"github.com/opensearch-project/opensearch-go/v2/opensearchapi"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/entities"
	"go.uber.org/zap"
)

// https://github.com/opensearch-project/opensearch-go/blob/main/USER_GUIDE.md
// https://github.com/opensearch-project/opensearch-go/blob/main/guides/search.md
type OpenSearchRepository interface {
	GetDocuments(query string) (*entities.OpenSearchResponse, error)
	GetDocumentsByIndex(query, index string) (*entities.OpenSearchResponse, error)
}

type openSearchRepository struct {
	client *opensearch.Client
}

func NewOpenSearchRepository(client *opensearch.Client) OpenSearchRepository {
	return &openSearchRepository{
		client: client,
	}
}

func (r *openSearchRepository) vitalCheck() error {
	zap.L().Info("vital checking for opensearch connection")

	pingRequest := opensearchapi.PingRequest{
		Pretty:     true,
		Human:      true,
		ErrorTrace: true,
	}
	pingResponse, err := pingRequest.Do(context.Background(), r.client)

	if err != nil {
		zap.L().Error("vital check error", zap.Error(err))
		return err
	} else {
		zap.L().Info("Ping response", zap.Any("response", pingResponse))
		if pingResponse.StatusCode == http.StatusOK {
			zap.L().Info("✅ connected!")
		}
	}
	return nil
}

func (r *openSearchRepository) GetDocuments(query string) (*entities.OpenSearchResponse, error) {
	err := r.vitalCheck()
	if err != nil {
		return nil, err
	}

	res, err := r.client.Search(
		r.client.Search.WithQuery(query),
	)
	if err != nil {
		return nil, err
	}

	defer res.Body.Close()
	bodyContent, err := io.ReadAll(res.Body)
	if err != nil {
		zap.L().Error("unexpected error while reading search response", zap.Error(err))
	}

	searchResposne := new(entities.OpenSearchResponse)
	err = json.Unmarshal(bodyContent, searchResposne)
	if err != nil {
		zap.L().Error("unexpected error while parsing search response to struct", zap.Error(err))
	}
	zap.L().Debug("search response",
		zap.Any("documents", searchResposne.Hits.Hits),
	)

	return searchResposne, nil
}

func (r *openSearchRepository) GetDocumentsByIndex(query, index string) (*entities.OpenSearchResponse, error) {
	err := r.vitalCheck()
	if err != nil {
		return nil, err
	}

	res, err := r.client.Search(
		r.client.Search.WithIndex(index),
		r.client.Search.WithQuery(query),
	)
	if err != nil {
		return nil, err
	}

	defer res.Body.Close()
	bodyContent, err := io.ReadAll(res.Body)
	if err != nil {
		zap.L().Error("unexpected error while reading search response", zap.Error(err))
	}

	searchResposne := new(entities.OpenSearchResponse)
	err = json.Unmarshal(bodyContent, searchResposne)
	if err != nil {
		zap.L().Error("unexpected error while parsing search response to struct", zap.Error(err))
	}
	zap.L().Debug("search response",
		zap.Any("response", searchResposne),
	)

	return searchResposne, nil
}
