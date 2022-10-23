package model

type Message struct {
	Id    string `json:"id" dynamodbav:"id"`
	Topic string `json:"topic" dynamodbav:"topic"`
	Text  string `json:"text" dynamodbav:"text"`
}
