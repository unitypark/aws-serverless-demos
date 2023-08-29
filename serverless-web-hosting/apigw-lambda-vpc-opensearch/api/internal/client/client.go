package client

import (
	"crypto/tls"
	"net/http"

	"github.com/opensearch-project/opensearch-go/v2"
	appConfig "github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/config"
	"go.uber.org/zap"
)

var openSearchClient *opensearch.Client

func New(config *appConfig.Config) (*opensearch.Client, error) {
	if openSearchClient == nil {
		zap.L().Debug("opensearch endpoint", zap.String("endpoint", config.OpenSearchEndpoint))
		zap.L().Debug("opensearch master username", zap.String("username", config.OpenSearchMasterUsername))
		zap.L().Debug("opensearch master user password", zap.String("password", config.OpenSearchMasterUserPassword))
		zap.L().Info("initializing new opensearch client")

		client, err := opensearch.NewClient(opensearch.Config{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // For testing only. Use certificate for validation.
			},
			Addresses: []string{config.OpenSearchEndpoint},
			Username:  config.OpenSearchMasterUsername,
			Password:  config.OpenSearchMasterUserPassword,
		})
		if err != nil {
			return nil, err
		}
		openSearchClient = client
	}
	return openSearchClient, nil
}
