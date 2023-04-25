package router

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/unitypark/serverless-web-hosting/lambda/app/response"
	"github.com/unitypark/serverless-web-hosting/lambda/internal/service"
	"go.uber.org/zap"

	"github.com/gofiber/fiber/v2"
)

func NetworkStationRouter(app fiber.Router, networkStationService service.NetworkStationService) {
	app.Get("/api/stations", GetNetworkStations(networkStationService))
	app.Get("/api/stations/fastest", GetFastestNetworkStation(networkStationService))
}

// GetNetworkStations is handler/controller which retrieves all available network stations
func GetNetworkStations(networkSpeedService service.NetworkStationService) fiber.Handler {
	zap.L().Debug("routing request to GET /api/stations")
	return func(c *fiber.Ctx) error {
		allNetworkStations, err := networkSpeedService.GetAllNetworks()
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		zap.L().Debug(fmt.Sprintf("result: %v", allNetworkStations))
		c.Status(http.StatusOK)

		zap.L().Debug("returning context", zap.Any("fiber.context", c))
		return c.JSON(response.GetNetworkStationsSuccessResponse(allNetworkStations))
	}
}

// GetNetworkStationSpeed is handler/controller which retrieves the most fastest available network station
func GetFastestNetworkStation(networkSpeedService service.NetworkStationService) fiber.Handler {
	zap.L().Debug("routing request to GET /api/stations/fastest")
	return func(c *fiber.Ctx) error {
		latitude := c.Query("latitude")
		coordinateX, err := strconv.Atoi(latitude)
		if err != nil {
			c.Status(http.StatusBadRequest)
			zap.L().Error(fmt.Sprintf("invalid query latitude: %s", latitude))
			return c.JSON(response.UrlErrorResponse(errors.New("query latitude is invalid")))
		}

		longitude := c.Query("longitude")
		coordinateY, err := strconv.Atoi(longitude)
		if err != nil {
			c.Status(http.StatusBadRequest)
			zap.L().Error(fmt.Sprintf("invalid query longitude: %s", longitude))
			return c.JSON(response.UrlErrorResponse(errors.New("query longitude is invalid")))
		}

		station, speed, err := networkSpeedService.GetFastestNetworkStation(coordinateX, coordinateY)
		if err != nil {
			c.Status(http.StatusInternalServerError)
			return c.JSON(response.UrlErrorResponse(err))
		}
		c.Status(http.StatusOK)
		var msg string
		if station == nil || speed == nil {
			msg = fmt.Sprintf("No network station within reach for point %d,%d", coordinateX, coordinateY)
			return c.JSON(response.GetNetworkStationNotFoundResponse(&msg))
		} else {
			msg = fmt.Sprintf("Best network station for point %d,%d is %d,%d with speed %.1f", coordinateX, coordinateY, station.Longitude, station.Latitude, *speed)
			return c.JSON(response.GetNetworkStationFoundResponse(station, speed, &msg))
		}
	}
}
