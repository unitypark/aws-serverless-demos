package server

import (
	"strings"
	"time"

	swagger "github.com/arsmn/fiber-swagger/v2"
	"github.com/deloittepark/cqrs-microservices/docs"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
)

const (
	readTimeout  = 15 * time.Second
	writeTimeout = 15 * time.Second
)

func (s *server) runHttpServer() error {
	s.mapRoutes()
	s.fiber.Server().ReadTimeout = readTimeout
	s.fiber.Server().WriteTimeout = writeTimeout

	return s.fiber.Listen(s.cfg.Http.Port)
}

func (s *server) mapRoutes() {
	docs.SwaggerInfo.Version = "1.0"
	docs.SwaggerInfo.Title = "API Gateway"
	docs.SwaggerInfo.Description = "API Gateway CQRS Todo microservices."
	docs.SwaggerInfo.Version = "1.0"
	docs.SwaggerInfo.BasePath = "/api/v1"

	s.fiber.Get("/swagger/*", swagger.HandlerDefault)

	s.fiber.Use(s.mw.RequestLoggerMiddleware())
	s.fiber.Use(recover.New(recover.Config{
		EnableStackTrace: true,
	}))
	s.fiber.Use(cors.New())
	s.fiber.Use(requestid.New())
	s.fiber.Use(compress.New(compress.Config{
		Next: func(c *fiber.Ctx) bool {
			return strings.Contains(c.Path(), "swagger")
		},
		Level: compress.LevelBestSpeed,
	}))
}
