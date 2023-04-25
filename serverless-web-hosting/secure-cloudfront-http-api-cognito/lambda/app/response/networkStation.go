package response

import (
	"fmt"
	"strconv"

	"github.com/unitypark/serverless-web-hosting/lambda/internal/entities"

	"github.com/gofiber/fiber/v2"
)

// NetworkStationResponse is the presenter object which will be passed in the response by Handler
type NetworkStationResponse struct {
	ID        string `json:"id,omitempty"`
	Longitude string `json:"longitude,omitempty"`
	Latitude  string `json:"latitude,omitempty"`
	Reach     string `json:"reach,omitempty"`
	Speed     string `json:"speed,omitempty"`
	Message   string `json:"message,omitempty"`
}

type Response struct {
	Networks []NetworkStationResponse `json:"networks,omitempty"`
	Network  NetworkStationResponse   `json:"network,omitempty"`
	Error    string                   `json:"error,omitempty"`
}

func GetNetworkStationsSuccessResponse(networkStations *[]entities.NetworkStation) *fiber.Map {
	var response []NetworkStationResponse
	for _, station := range *networkStations {
		response = append(response, NetworkStationResponse{
			ID:        station.ID,
			Longitude: strconv.Itoa(station.Longitude),
			Latitude:  strconv.Itoa(station.Latitude),
			Reach:     strconv.Itoa(station.Latitude),
		})
	}
	return &fiber.Map{
		"networks": response,
	}
}

func GetNetworkStationFoundResponse(network *entities.NetworkStation, speed *float64, msg *string) *fiber.Map {
	return &fiber.Map{
		"network": NetworkStationResponse{
			Longitude: strconv.Itoa(network.Longitude),
			Latitude:  strconv.Itoa(network.Latitude),
			Speed:     fmt.Sprintf("%.1f", *speed),
			Message:   *msg,
		},
	}
}

func GetNetworkStationNotFoundResponse(msg *string) *fiber.Map {
	return &fiber.Map{
		"network": NetworkStationResponse{
			Message: *msg,
		},
	}
}

// UrlErrorResponse is the ErrorResponse that will be passed in the response by Handler
func UrlErrorResponse(err error) *fiber.Map {
	return &fiber.Map{
		"error": err.Error(),
	}
}
