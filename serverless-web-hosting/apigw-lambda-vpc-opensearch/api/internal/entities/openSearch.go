package entities

type OpenSearchResponse struct {
	Took int64 `json:"took"`
	Hits Hits  `json:"hits"`
}

type Hits struct {
	Total Total  `json:"total"`
	Hits  []*Hit `json:"hits"`
}

type Total struct {
	Value int64 `json:"value"`
}

type Hit struct {
	Index  string  `json:"_index"`
	ID     string  `json:"_id"`
	Score  float64 `json:"_score"`
	Source *Reddit `json:"_source"`
}
