package repository

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/expression"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/deloittepark/apigw-lambda-clean-architecture/internal/client"
	"github.com/deloittepark/apigw-lambda-clean-architecture/internal/entities"
)

// Repository interface allows us to access the CRUD Operations in dynamodb.
type DynamoDbRepository interface {
	CreateEmployee(employee *entities.Employee) error
	GetEmployees() (*[]entities.Employee, error)
	UpdateEmployee(employee *entities.Employee) (*entities.Employee, error)
	DeleteEmployee(ID string) error
}

type dynamoDbRepository struct {
	table  *string
	client *dynamodb.Client
}

// NewRepo is the single instance repo that is being created.
func NewRepository(client *client.Client) DynamoDbRepository {
	return &dynamoDbRepository{
		table:  client.Table,
		client: client.DynamoDbClient,
	}
}

// CreateEmployee is a dynamodb repository that helps to create employee
func (r *dynamoDbRepository) CreateEmployee(employee *entities.Employee) error {
	item, err := attributevalue.MarshalMap(employee)
	if err != nil {
		return err
	}
	_, err = r.client.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: r.table,
		Item:      item,
	})
	return err
}

// GetEmployees is a dynamodb repository that helps to get all employees
func (r *dynamoDbRepository) GetEmployees() (*[]entities.Employee, error) {
	var (
		notes     = &[]entities.Employee{}
		scanInput = &dynamodb.ScanInput{
			TableName: r.table,
		}
	)
	output, err := r.client.Scan(context.TODO(), scanInput)
	if err != nil {
		return nil, err
	}

	err = attributevalue.UnmarshalListOfMaps(output.Items, notes)
	if err != nil {
		return nil, err
	}
	return notes, nil
}

// CreateEmployee is a dynamodb repository that helps to create employee
func (r *dynamoDbRepository) UpdateEmployee(employee *entities.Employee) (*entities.Employee, error) {
	var (
		update = expression.Set(
			expression.Name("FirstName"), expression.Value(employee.FirstName),
		).Set(
			expression.Name("LastName"), expression.Value(employee.LastName),
		).Set(
			expression.Name("ManagerLoginAlias"), expression.Value(employee.ManagerLoginAlias),
		).Set(
			expression.Name("Skills"), expression.Value(employee.Skills),
		)
		expr, _         = expression.NewBuilder().WithUpdate(update).Build()
		updateItemInput = &dynamodb.UpdateItemInput{
			TableName: r.table,
			Key: map[string]types.AttributeValue{
				entities.PK: &types.AttributeValueMemberS{Value: employee.ManagerLoginAlias},
			},
			ReturnValues:              types.ReturnValueAllNew,
			UpdateExpression:          expr.Update(),
			ExpressionAttributeValues: expr.Values(),
			ExpressionAttributeNames:  expr.Names(),
		}
	)
	output, err := r.client.UpdateItem(context.TODO(), updateItemInput)
	if err != nil {
		return nil, err
	}

	err = attributevalue.UnmarshalMap(output.Attributes, employee)
	if err != nil {
		return nil, err
	}
	return employee, nil
}

func (r *dynamoDbRepository) DeleteEmployee(ID string) error {
	deleteItemInput := &dynamodb.DeleteItemInput{
		TableName: r.table,
		Key: map[string]types.AttributeValue{
			entities.PK: &types.AttributeValueMemberS{Value: ID},
		},
	}
	_, err := r.client.DeleteItem(context.TODO(), deleteItemInput)

	return err
}
