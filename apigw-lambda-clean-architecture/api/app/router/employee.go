package router

import (
	"errors"
	"net/http"

	"github.com/deloittepark/apigw-lambda-clean-architecture/app/response"
	"github.com/deloittepark/apigw-lambda-clean-architecture/internal/entities"
	"github.com/deloittepark/apigw-lambda-clean-architecture/internal/service"

	"github.com/gofiber/fiber/v2"
)

// EmployeeRouter is the Router for GoFiber App
func EmployeeRouter(app fiber.Router, service service.Service) {
	app.Get("/employees", GetEmployees(service))
	app.Post("/employees", AddEmployee(service))
	app.Put("/employees", UpdateEmployee(service))
	app.Delete("/employees", RemoveEmployee(service))
}

// GetEmployees is handler/controller which lists all Employees from the Employee Table
func GetEmployees(service service.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		fetched, err := service.FetchEmployees()
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.EmployeeErrorResponse(err))
		}
		return c.JSON(response.EmployeesSuccessResponse(fetched))
	}
}

// AddEmployee is handler/controller which creates Employee in the Employee Table
func AddEmployee(service service.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var requestBody entities.Employee
		err := c.BodyParser(&requestBody)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return c.JSON(response.EmployeeErrorResponse(err))
		}
		if requestBody.LoginAlias == "" {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.EmployeeErrorResponse(
				errors.New("please specify loginAlias")))
		}
		result, err := service.InsertEmployee(&requestBody)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.EmployeeErrorResponse(err))
		}
		return c.JSON(response.EmployeeSuccessResponse(result))
	}
}

// UpdateEmployee is handler/controller which updates data of Books in the Employee Table
func UpdateEmployee(service service.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var requestBody entities.Employee
		err := c.BodyParser(&requestBody)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return c.JSON(response.EmployeeErrorResponse(err))
		}
		result, err := service.UpdateEmployee(&requestBody)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.EmployeeErrorResponse(err))
		}
		return c.JSON(response.EmployeeSuccessResponse(result))
	}
}

// RemoveBook is handler/controller which removes Books from the BookShop
func RemoveEmployee(service service.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var requestBody entities.DeleteRequest
		err := c.BodyParser(&requestBody)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return c.JSON(response.EmployeeErrorResponse(err))
		}
		employeeId := requestBody.LoginAlias
		err = service.RemoveEmployee(employeeId)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.EmployeeErrorResponse(err))
		}
		return c.JSON(&fiber.Map{
			"code":  http.StatusOK,
			"data":  "removed successfully",
			"error": nil,
		})
	}
}
