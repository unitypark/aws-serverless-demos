package router

import (
	"errors"
	"net/http"

	swagger "github.com/arsmn/fiber-swagger/v2"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/app/response"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/internal/entities"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/internal/service"
	"go.uber.org/zap"

	"github.com/gofiber/fiber/v2"
)

// UrlRouter is the Router for GoFiber App
func UrlRouter(api fiber.Router, service service.Service) {
	api.Get("/", HealthCheck)
	api.Get("/swagger/*", swagger.HandlerDefault) // default
	api.Get("/urls", GetUrls(service))
	api.Post("/urls", AddUrl(service))
	api.Get("/urls/:path", GetUrl(service))
}

// HealthCheck godoc
// @Summary Show the status of server.
// @Description get the status of server.
// @Tags root
// @Accept */*
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router / [get]
func HealthCheck(c *fiber.Ctx) error {
	res := map[string]interface{}{
		"data": "Server is up and running",
	}
	if err := c.JSON(res); err != nil {
		return err
	}
	return nil
}

// GetUrls is handler/controller which
// GetUrls godoc
// @Summary Get All Urls from DynamoDB Table
// @Description returns all Urls from the UrlShortener DynamoDB Table.
// @Tags root
// @Accept */*
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /urls [get]
func GetUrls(service service.Service) fiber.Handler {
	zap.L().Debug("routing request to GET /urls")
	return func(c *fiber.Ctx) error {
		results, err := service.GetAllUrls()
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		return c.JSON(response.UrlsSuccessResponse(results))
	}
}

// GetUrl is handler/controller which retrieves original Url of shortened url from the UrlShortener Table
func GetUrl(service service.Service) fiber.Handler {
	zap.L().Debug("routing request to GET /urls/:path")
	return func(c *fiber.Ctx) error {
		pathParameter := c.Params("path")
		if len(pathParameter) == 0 {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(errors.New("path parameter is empty")))
		}
		result, err := service.GetOriginalUrl(&pathParameter)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		c.Set("Location", result.OriginalUrl)
		c.Status(http.StatusTemporaryRedirect)

		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.UrlSuccessResponse(result))
	}
}

// AddUrl is handler/controller which creates Url Entry in the UrlConverter Table
func AddUrl(service service.Service) fiber.Handler {
	zap.L().Debug("routing request to POST /urls")
	return func(c *fiber.Ctx) error {
		var requestBody entities.PostUrlRequest
		err := c.BodyParser(&requestBody)
		if err != nil {
			c.Status(http.StatusBadRequest)
			return c.JSON(response.UrlErrorResponse(err))
		}
		if requestBody.Url == "" {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(
				errors.New("please specify converting url in body")))
		}
		result, err := service.GenerateUrl(&requestBody.Url)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		c.Status(http.StatusOK)
		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.UrlSuccessResponse(result))
	}
}
