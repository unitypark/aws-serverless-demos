package response

import (
	"net/http"

	"github.com/deloittepark/apigw-lambda-clean-architecture/internal/entities"

	"github.com/gofiber/fiber/v2"
)

// Book is the presenter object which will be passed in the response by Handler
type Employee struct {
	ID        string   `json:"id"`
	FirstName string   `json:"firstname"`
	LastName  string   `json:"lastname"`
	Skills    []string `json:"skills"`
	IsManager bool     `json:"isManager"`
}

// EmployeeSuccessResponse is the singular SuccessResponse that will be passed in the response by Handler
func EmployeeSuccessResponse(data *entities.Employee) *fiber.Map {
	employee := Employee{
		ID:        data.LoginAlias,
		FirstName: data.FirstName,
		LastName:  data.LastName,
		IsManager: data.ManagerLoginAlias != "NA",
	}
	return &fiber.Map{
		"code":  http.StatusOK,
		"data":  employee,
		"error": nil,
	}
}

// EmployeesSuccessResponse is the list SuccessResponse that will be passed in the response by Handler
func EmployeesSuccessResponse(data *[]entities.Employee) *fiber.Map {
	return &fiber.Map{
		"code":  http.StatusOK,
		"data":  data,
		"error": nil,
	}
}

// EmployeeErrorResponse is the ErrorResponse that will be passed in the response by Handler
func EmployeeErrorResponse(err error) *fiber.Map {
	return &fiber.Map{
		"code":  http.StatusBadGateway,
		"data":  "",
		"error": err.Error(),
	}
}
