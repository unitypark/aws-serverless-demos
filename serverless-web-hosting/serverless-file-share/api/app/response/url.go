package response

import (
	"github.com/deloittepark/serverless-file-share/internal/entities"

	"github.com/gofiber/fiber/v2"
)

// Url is the presenter object which will be passed in the response by Handler
type Url struct {
	Url       string `json:"url,omitempty"`
	Filename  string `json:"filename,omitempty"`
	AccessKey string `json:"accessKey,omitempty"`
}

func GetUrlSuccessResponse(data *entities.Url) *fiber.Map {
	url := Url{
		Url:      data.Url,
		Filename: data.Filename,
	}
	return &fiber.Map{
		"data":  url,
		"error": nil,
	}
}

// UrlSuccessResponse is the singular SuccessResponse that will be passed in the response by Handler
func CreateUrlSuccessResponse(data *entities.Url) *fiber.Map {
	url := Url{
		AccessKey: data.AccessKey,
	}
	return &fiber.Map{
		"data":  url,
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
