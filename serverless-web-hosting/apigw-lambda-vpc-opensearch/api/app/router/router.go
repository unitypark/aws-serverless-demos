package router

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/app/response"
	"github.com/unitypark/apigw-lambda-vpc-opensearch/api/internal/service"
	"go.uber.org/zap"

	"github.com/gofiber/fiber/v2"
)

// GET http://example.com/search/?query=abc
func RouteGlobalSearch(fiberApp *fiber.App, service service.OpenSearchService) fiber.Router {
	return fiberApp.Get("/api/search", searchGlobally(service))
}

// GET http://example.com/search/reddit/?query=abc
func RouteIndexSearch(fiberApp *fiber.App, service service.OpenSearchService) fiber.Router {
	return fiberApp.Get("/api/search/:index", searchInIndex(service))
}

func searchGlobally(openSearchService service.OpenSearchService) fiber.Handler {
	zap.L().Info("routing request to GET /api/search")
	return func(c *fiber.Ctx) error {
		zap.L().Info("fiber context", zap.Any("fiber.Ctx", c))
		query := c.Query("query")
		zap.L().Info("incoming query", zap.String("query", query))
		if len(query) == 0 {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.ErrorResponse(errors.New("query parameter is empty")))
		}
		zap.L().Debug(fmt.Sprintf("retrieved query parameter: %s", query))

		result, err := openSearchService.GlobalSearch(query)
		if err != nil {
			zap.L().Error("unexpected error", zap.Error(err))
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.ErrorResponse(err))
		}
		c.Status(http.StatusOK)
		return c.JSON(response.SuccessResponse(result))
	}
}

func searchInIndex(openSearchService service.OpenSearchService) fiber.Handler {
	zap.L().Info("routing request to GET /api/search/:index")
	return func(c *fiber.Ctx) error {
		zap.L().Info("fiber context", zap.Any("fiber.Ctx", c))

		index := c.Params("index")
		if len(index) == 0 {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.ErrorResponse(errors.New("index path parameter is empty")))
		}
		zap.L().Info(fmt.Sprintf("retrieved path parameter: %s", index))

		query := c.Query("query")
		if len(query) == 0 {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.ErrorResponse(errors.New("query parameter is empty")))
		}
		zap.L().Info(fmt.Sprintf("retrieved query parameter: %s", query))

		result, err := openSearchService.IndexSearch(query, index)
		if err != nil {
			zap.L().Error("unexpected error", zap.Error(err))
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.ErrorResponse(err))
		}
		c.Status(http.StatusOK)

		return c.JSON(response.SuccessResponse(result))
	}
}
