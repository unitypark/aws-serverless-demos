package dto

/* import readerService "github.com/deloittepark/cqrs-microservices/reader_service/proto"

type TodosListResponse struct {
	TotalCount int64           `json:"totalCount" bson:"totalCount"`
	TotalPages int64           `json:"totalPages" bson:"totalPages"`
	Page       int64           `json:"page" bson:"page"`
	Size       int64           `json:"size" bson:"size"`
	HasMore    bool            `json:"hasMore" bson:"hasMore"`
	Todos      []*TodoResponse `json:"todos" bson:"todos"`
}

func ProductsListResponseFromGrpc(listResponse *readerService.SearchRes) *TodosListResponse {
	list := make([]*TodoResponse, 0, len(listResponse.GetTodos()))
	for _, todo := range listResponse.GetTodos() {
		list = append(list, TodoResponseFromGrpc(todo))
	}

	return &TodosListResponse{
		TotalCount: listResponse.GetTotalCount(),
		TotalPages: listResponse.GetTotalPages(),
		Page:       listResponse.GetPage(),
		Size:       listResponse.GetSize(),
		HasMore:    listResponse.GetHasMore(),
		Todos:      list,
	}
} */
