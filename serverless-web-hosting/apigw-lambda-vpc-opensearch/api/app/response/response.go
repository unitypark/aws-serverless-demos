package response

import (
	"github.com/gofiber/fiber/v2"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/dto"
)

type Response struct {
	Data  *dto.OpenSearchDTO `json:"data"`
	Error string             `json:"error"`
}

func SuccessResponse(data *dto.OpenSearchDTO) *fiber.Map {
	return &fiber.Map{
		"data":  data,
		"error": nil,
	}
}

func ErrorResponse(err error) *fiber.Map {
	return &fiber.Map{
		"data":  "",
		"error": err.Error(),
	}
}
