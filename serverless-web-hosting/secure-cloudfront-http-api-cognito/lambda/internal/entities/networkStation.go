package entities

type NetworkStation struct {
	ID        string `json:"id" dynamodbav:"ID"`
	Longitude int    `json:"longitude" dynamodbav:"Longitude,omitempty"`
	Latitude  int    `json:"latitude" dynamodbav:"Latitude,omitempty"`
	Reach     int    `json:"reach" dynamodbav:"Reach,omitempty"`
}
