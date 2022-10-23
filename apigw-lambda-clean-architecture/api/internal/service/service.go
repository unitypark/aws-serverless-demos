package service

import (
	"github.com/deloittepark/apigw-lambda-clean-architecture/internal/entities"
	"github.com/deloittepark/apigw-lambda-clean-architecture/internal/repository"
)

// Service is an interface from which our api module can access our repository of all our models.
type Service interface {
	InsertEmployee(employee *entities.Employee) (*entities.Employee, error)
	FetchEmployees() (*[]entities.Employee, error)
	UpdateEmployee(employee *entities.Employee) (*entities.Employee, error)
	RemoveEmployee(ID string) error
}

type service struct {
	repository repository.DynamoDbRepository
}

// NewEmployeeService is used to create a single instance of the service
func NewEmployeeService(r repository.DynamoDbRepository) Service {
	return &service{
		repository: r,
	}
}

// InsertEmployee is a service layer that helps insert employee in Employee Table
func (s *service) InsertEmployee(employee *entities.Employee) (*entities.Employee, error) {
	// additional business logic goes here
	return employee, s.repository.CreateEmployee(employee)
}

// FetchEmployees is a service layer that helps fetch all employees in Employee Table
func (s *service) FetchEmployees() (*[]entities.Employee, error) {
	// additional business logic goes here
	return s.repository.GetEmployees()
}

// UpdateEmployee is a service layer that helps update employee in Employee Table
func (s *service) UpdateEmployee(employee *entities.Employee) (*entities.Employee, error) {
	// additional business logic goes here
	return s.repository.UpdateEmployee(employee)
}

// RemoveEmployee is a service layer that helps remove employee from Employee Table
func (s *service) RemoveEmployee(ID string) error {
	// additional business logic goes here
	return s.repository.DeleteEmployee(ID)
}
