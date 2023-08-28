package dto

import "github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/entities"

type Document struct {
	Index  string           `json:"index"`
	ID     string           `json:"id"`
	Score  float64          `json:"score"`
	Reddit *entities.Reddit `json:"reddit"`
}

type OpenSearchDTO struct {
	Time      int64       `json:"time"`
	Total     int64       `json:"total"`
	Documents []*Document `json:"documents"`
}

func ToDto(osResponse *entities.OpenSearchResponse) *OpenSearchDTO {
	osDto := new(OpenSearchDTO)
	osDto.Time = osResponse.Took
	osDto.Total = osResponse.Hits.Total.Value

	for _, hit := range osResponse.Hits.Hits {
		osDto.Documents = append(osDto.Documents, &Document{
			Index:  hit.Index,
			ID:     hit.ID,
			Score:  hit.Score,
			Reddit: hit.Source,
		})
	}
	return osDto
}
