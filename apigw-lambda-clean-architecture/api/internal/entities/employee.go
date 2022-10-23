package entities

const PK string = "LoginAlias"

// Employee represents an employee entity object stored in the database
type Employee struct {
	LoginAlias        string   `json:"loginAlias" dynamodbav:"LoginAlias"`
	FirstName         string   `json:"firstName" dynamodbav:"FirstName,omitempty"`
	LastName          string   `json:"lastName" dynamodbav:"LastName,omitempty"`
	ManagerLoginAlias string   `json:"managerLoginAlias" dynamodbav:"ManagerLoginAlias,omitempty"`
	Skills            []string `json:"skills" dynamodbav:"Skills,omitempty"`
}

// DeleteRequest struct is used to parse Delete Reqeusts for Books
type DeleteRequest struct {
	LoginAlias string `json:"loginAlias"`
}
