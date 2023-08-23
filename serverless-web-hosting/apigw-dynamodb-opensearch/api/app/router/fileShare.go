package router

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/unitypark/apigw-dynamodb-opensearch/api/app/response"
	"github.com/unitypark/apigw-dynamodb-opensearch/api/internal/service"
	"go.uber.org/zap"

	"github.com/gofiber/fiber/v2"
)

const (
	DOWNLOAD_URL_EXPIRING_TIME_IN_MINUTES int = 60
	UPLOAD_URL_EXPIRING_TIME_IN_MINUTES   int = 10
)

type (
	postUploadRequest struct {
		Path string `json:"path"`
	}
	postDownloadRequest struct {
		Path string `json:"path"`
	}
)

func FileShareRouter(app fiber.Router, fileShareService service.FileShareService) {
	app.Post("/api/uploads", PostUploadUrl(fileShareService))
	app.Post("/api/downloads", PostDownloadUrl(fileShareService))
	app.Get("/api/downloads/:key", GetDownloadUrl(fileShareService))
}

func PostUploadUrl(fileShareService service.FileShareService) fiber.Handler {
	zap.L().Debug("routing request to POST /api/uploads")
	return func(c *fiber.Ctx) error {
		username := c.GetReqHeaders()["Username"]
		zap.L().Info("username from header", zap.String("username", username))

		var requestBody postUploadRequest
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
		zap.L().Info(fmt.Sprintf("retrieved path from body: %s", requestBody.Path))

		result, err := fileShareService.CreateUploadUrl(requestBody.Path, username, UPLOAD_URL_EXPIRING_TIME_IN_MINUTES)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		c.Status(http.StatusOK)
		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.UrlSuccessResponse(result))
	}
}

func PostDownloadUrl(fileShareService service.FileShareService) fiber.Handler {
	zap.L().Debug("routing request to POST /api/downloads")
	return func(c *fiber.Ctx) error {
		username := c.GetReqHeaders()["Username"]
		zap.L().Info("username from header", zap.String("username", username))

		var requestBody postDownloadRequest
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
		zap.L().Info(fmt.Sprintf("retrieved path from body: %s", requestBody.Path))

		result, err := fileShareService.CreateDownloadUrl(requestBody.Path, username, DOWNLOAD_URL_EXPIRING_TIME_IN_MINUTES)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		c.Status(http.StatusOK)
		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.UrlSuccessResponse(result))
	}
}

func GetDownloadUrl(fileShareService service.FileShareService) fiber.Handler {
	zap.L().Debug("routing request to GET /api/downloads/:key")
	return func(c *fiber.Ctx) error {
		username := c.GetReqHeaders()["Username"]
		zap.L().Info("username from header", zap.String("username", username))

		accessKey := c.Params("key")
		if len(accessKey) == 0 {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(errors.New("path parameter is empty")))
		}
		zap.L().Debug(fmt.Sprintf("retrieved path parameter: %s", accessKey))

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
