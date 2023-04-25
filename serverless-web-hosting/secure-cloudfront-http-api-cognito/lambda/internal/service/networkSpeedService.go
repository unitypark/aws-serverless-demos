package service

import (
	"fmt"
	"math"

	appConfig "github.com/unitypark/serverless-web-hosting/lambda/internal/config"
	"github.com/unitypark/serverless-web-hosting/lambda/internal/entities"
	"github.com/unitypark/serverless-web-hosting/lambda/internal/repository"
	"go.uber.org/zap"
)

// Service is an interface from which our api module can access our repository of all our models.
type NetworkStationService interface {
	GetAllNetworks() (*[]entities.NetworkStation, error)
	GetFastestNetworkStation(coordinateX, coordinateY int) (*entities.NetworkStation, *float64, error)
}

type networkStationService struct {
	appConfig  *appConfig.Config
	repository repository.DynamoDbRepository
}

// NewNetworkStationService is used to create a single instance of the service
func NewNetworkStationService(c *appConfig.Config, r repository.DynamoDbRepository) NetworkStationService {
	return &networkStationService{
		appConfig:  c,
		repository: r,
	}
}

// Url is a service layer that helps create url in DynamoDB Table
func (s *networkStationService) GetAllNetworks() (*[]entities.NetworkStation, error) {
	return s.repository.ScanNetworkStations()
}

// Url is a service layer that helps to retrieve original url from DynamoDB Table
func (s *networkStationService) GetFastestNetworkStation(coordinateX, coordinateY int) (*entities.NetworkStation, *float64, error) {
	networkStations, err := s.repository.ScanNetworkStations()
	if err != nil {
		zap.L().Error("unexpected error during scanning network stations")
		return nil, nil, err
	}
	var fastestStation entities.NetworkStation
	var bestSpeed *float64
	for _, station := range *networkStations {
		isReachable, distanceSquare := isStationReachable(&station, &coordinateX, &coordinateY)
		if isReachable {
			speed := getSpeed(&station.Reach, distanceSquare)
			if bestSpeed == nil {
				bestSpeed = speed
				fastestStation = station
				zap.L().Debug(fmt.Sprintf("current best speed: %f, station: %v", *bestSpeed, fastestStation))
			} else {
				if *bestSpeed < *speed {
					bestSpeed = speed
					fastestStation = station
					zap.L().Debug(fmt.Sprintf("current best speed: %f, station: %v", *bestSpeed, fastestStation))
				}
			}
		}
	}
	return &fastestStation, bestSpeed, nil
}

func isStationReachable(station *entities.NetworkStation, coordinateX, coordinateY *int) (bool, *float64) {
	radiusSquare := math.Pow(float64(station.Reach), 2)
	distLatitudeSquare := math.Pow(float64(*coordinateX)-float64(station.Latitude), 2)
	distLongitudeSquare := math.Pow((float64(*coordinateY) - float64(station.Longitude)), 2)
	distanceSquare := distLatitudeSquare + distLongitudeSquare

	zap.L().Debug(fmt.Sprintf("radiusSquare : %f", radiusSquare))
	zap.L().Debug(fmt.Sprintf("distanceSquare : %f", distanceSquare))

	if radiusSquare > distanceSquare {
		zap.L().Info(fmt.Sprintf("device location (%d, %d) is reachable to station: %v", *coordinateX, *coordinateY, *station))
		return true, &distanceSquare
	}
	zap.L().Info(fmt.Sprintf("device location (%d, %d) is not reachable to station: %v", *coordinateX, *coordinateY, *station))
	return false, nil
}

func getSpeed(reach *int, distanceSquare *float64) *float64 {
	distance := math.Sqrt(*distanceSquare)
	zap.L().Info(fmt.Sprintf("distance to station: %f", distance))

	speed := math.Pow((float64(*reach) - distance), 2)
	zap.L().Info(fmt.Sprintf("expecting speed from station: %f", speed))
	return &speed
}
