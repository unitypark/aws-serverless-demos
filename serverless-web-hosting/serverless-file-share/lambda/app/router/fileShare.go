package router

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/unitypark/serverless-file-share/lambda/app/response"
	"github.com/unitypark/serverless-file-share/lambda/internal/entities"
	"github.com/unitypark/serverless-file-share/lambda/internal/service"
	"go.uber.org/zap"

	"github.com/gofiber/fiber/v2"
)

// FileShareRouter is the Router for GoFiber App
func FileShareRouter(app fiber.Router, fileShareService service.FileShareService) {
	app.Get("/api/config", GetConfig(fileShareService))
	app.Post("/api/uploads", PostUploadUrl(fileShareService))
	app.Post("/api/downloads", PostDownloadUrl(fileShareService))
	app.Get("/api/downloads/:key", GetDownloadUrl(fileShareService))
}

// GetDownloadUrl is handler/controller which retrieves original Url of shortened url from the UrlShortener Table
func GetConfig(fileShareService service.FileShareService) fiber.Handler {
	zap.L().Debug("routing request to GET /api/config")
	return func(c *fiber.Ctx) error {
		c.Status(http.StatusOK)
		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.UrlSuccessResponse(new(entities.Asset)))
	}
}

// PostDownloadUrl is handler/controller which creates Url Entry in the UrlConverter Table
func PostUploadUrl(fileShareService service.FileShareService) fiber.Handler {
	zap.L().Debug("routing request to POST /api/uploads")
	return func(c *fiber.Ctx) error {
		var requestBody entities.PostDownloadRequest
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
		if requestBody.Username == "" {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(
				errors.New("please specify username in body")))
		}
		zap.L().Info(fmt.Sprintf("retrieved path from body: %s", requestBody.Path))
		zap.L().Info(fmt.Sprintf("retrieved username from body: %s", requestBody.Username))

		result, err := fileShareService.CreateUploadUrl(requestBody.Path, 60)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		c.Status(http.StatusOK)
		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.UrlSuccessResponse(result))
	}
}

// GetDownloadUrl is handler/controller which retrieves original Url of shortened url from the UrlShortener Table
func GetDownloadUrl(fileShareService service.FileShareService) fiber.Handler {
	zap.L().Debug("routing request to GET /api/downloads/:key")
	return func(c *fiber.Ctx) error {
		accessKey := c.Params("key")
		if len(accessKey) == 0 {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(errors.New("path parameter is empty")))
		}
		zap.L().Debug(fmt.Sprintf("retrieved path parameter: %s", accessKey))
		username := c.Query("id")
		if len(username) == 0 {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(errors.New("query user is empty")))
		}

		result, err := fileShareService.GetUrl(accessKey, username)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		zap.L().Debug(fmt.Sprintf("result: %v", result))
		c.Status(http.StatusOK)

		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.UrlSuccessResponse(result))
	}
}

// PostDownloadUrl is handler/controller which creates Url Entry in the UrlConverter Table
func PostDownloadUrl(fileShareService service.FileShareService) fiber.Handler {
	zap.L().Debug("routing request to POST /api/downloads")
	return func(c *fiber.Ctx) error {
		var requestBody entities.PostDownloadRequest
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
		if requestBody.Username == "" {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(
				errors.New("please specify username in body")))
		}
		zap.L().Info(fmt.Sprintf("retrieved path from body: %s", requestBody.Path))
		zap.L().Info(fmt.Sprintf("retrieved username from body: %s", requestBody.Username))

		result, err := fileShareService.CreateDownloadUrl(requestBody.Path, requestBody.Username, 60)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		c.Status(http.StatusOK)
		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.UrlSuccessResponse(result))
	}
}
