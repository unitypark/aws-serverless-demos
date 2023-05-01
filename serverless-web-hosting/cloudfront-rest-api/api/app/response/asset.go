package response

import (
	"github.com/unitypark/cloudfront-rest-api/internal/entities"

	"github.com/gofiber/fiber/v2"
)

// Asset is the presenter object which will be passed in the response by Handler
type Asset struct {
	Url       string `json:"url,omitempty"`
	Filename  string `json:"filename,omitempty"`
	AccessKey string `json:"accessKey,omitempty"`
}

func GetUrlSuccessResponse(data *entities.Asset) *fiber.Map {
	return &fiber.Map{
		"data": Asset{
			Url:      data.Url,
			Filename: data.Filename,
		},
		"error": nil,
	}
}

// UrlSuccessResponse is the singular SuccessResponse that will be passed in the response by Handler
func CreateUrlSuccessResponse(data *entities.Asset) *fiber.Map {
	return &fiber.Map{
		"data": Asset{
			AccessKey: data.AccessKey,
		},
		"error": nil,
	}
}

// UrlErrorResponse is the ErrorResponse that will be passed in the response by Handler
func UrlErrorResponse(err error) *fiber.Map {
	return &fiber.Map{
		"data":  "",
		"error": err.Error(),
	}
}
