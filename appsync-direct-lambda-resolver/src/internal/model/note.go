package model

type Note struct {
	Id        string `json:"id" dynamodbav:"id"`
	Name      string `json:"name" dynamodbav:"name"`
	Completed bool   `json:"completed" dynamodbav:"completed"`
}

type CreateNotePayload struct {
	Name      string `json:"name"`
	Completed bool   `json:"completed"`
}

type UpdateNotePayload struct {
	Id        string `json:"id"`
	Name      string `json:"name"`
	Completed bool   `json:"completed"`
}
