package router

import (
	"errors"
	"net/http"

	"github.com/deloittepark/docker-golang-fiber-url-shortener/app/response"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/internal/entities"
	"github.com/deloittepark/docker-golang-fiber-url-shortener/internal/service"
	"go.uber.org/zap"

	"github.com/gofiber/fiber/v2"
)

// UrlRouter is the Router for GoFiber App
func UrlRouter(app fiber.Router, service service.Service) {
	app.Get("/urls", GetUrls(service))
	app.Post("/urls", AddUrl(service))
	app.Get("/urls/:path", GetUrl(service))
}

// GetUrls is handler/controller which retrieves all Urls from the UrlShortener Table
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
