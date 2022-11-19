package response

import (
	"strings"

	"github.com/deloittepark/ecs-url-shortener/internal/entities"

	"github.com/gofiber/fiber/v2"
)

// Url is the presenter object which will be passed in the response by Handler
type Url struct {
	ID   string `json:"id"`
	Url  string `json:"url"`
	Path string `json:"path"`
}

// UrlSuccessResponse is the singular SuccessResponse that will be passed in the response by Handler
func UrlsSuccessResponse(urls *[]entities.Url) *fiber.Map {
	var response []Url
	for _, data := range *urls {
		url := Url{
			ID:   data.Id,
			Url:  strings.Join([]string{entities.Domain, data.Path}, "/"),
			Path: data.Path,
		}
		response = append(response, url)
	}
	return &fiber.Map{
		"data":  response,
		"error": nil,
	}
}

// UrlSuccessResponse is the singular SuccessResponse that will be passed in the response by Handler
func UrlSuccessResponse(data *entities.Url) *fiber.Map {
	url := Url{
		ID:   data.Id,
		Url:  strings.Join([]string{entities.Domain, data.Path}, "/"),
		Path: data.Path,
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
