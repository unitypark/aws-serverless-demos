package router

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/deloittepark/serverless-file-share/app/response"
	"github.com/deloittepark/serverless-file-share/internal/entities"
	"github.com/deloittepark/serverless-file-share/internal/service"
	"github.com/deloittepark/serverless-file-share/types"
	"go.uber.org/zap"

	"github.com/gofiber/fiber/v2"
)

// FileShareRouter is the Router for GoFiber App
func FileShareRouter(app fiber.Router, service service.Service) {
	app.Post("/downloads", PostDownloadUrl(service))
	app.Get("/downloads/:key", GetDownloadUrl(service))
}

// GetDownloadUrl is handler/controller which retrieves original Url of shortened url from the UrlShortener Table
func GetDownloadUrl(service service.Service) fiber.Handler {
	zap.L().Debug("routing request to GET /downloads/:key")
	return func(c *fiber.Ctx) error {
		pathParameter := c.Params("key")
		if len(pathParameter) == 0 {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(errors.New("path parameter is empty")))
		}
		zap.L().Debug(fmt.Sprintf("retrieved path parameter: %s", pathParameter))
		result, err := service.GetUrl(types.TYPE_DOWNLOAD, pathParameter)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		zap.L().Debug(fmt.Sprintf("result: %v", result))
		c.Status(http.StatusOK)

		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.GetUrlSuccessResponse(result))
	}
}

// PostDownloadUrl is handler/controller which creates Url Entry in the UrlConverter Table
func PostDownloadUrl(service service.Service) fiber.Handler {
	zap.L().Debug("routing request to POST /downloads")
	return func(c *fiber.Ctx) error {
		var requestBody entities.PostUrlRequest
		err := c.BodyParser(&requestBody)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return c.JSON(response.UrlErrorResponse(err))
		}
		if requestBody.Path == "" {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(
				errors.New("please specify converting url in body")))
		}
		zap.L().Debug(fmt.Sprintf("retrieved path from body: %s", requestBody.Path))
		result, err := service.CreateUrl(types.TYPE_DOWNLOAD, requestBody.Path, 15)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		c.Status(http.StatusOK)
		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.CreateUrlSuccessResponse(result))
	}
}
