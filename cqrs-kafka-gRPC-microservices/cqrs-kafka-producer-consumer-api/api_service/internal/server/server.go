package server

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/deloittepark/cqrs-microservices/api_service/config"
	"github.com/deloittepark/cqrs-microservices/api_service/internal/middlewares"
	v1 "github.com/deloittepark/cqrs-microservices/api_service/internal/todos/delivery/http/v1"
	"github.com/deloittepark/cqrs-microservices/api_service/internal/todos/service"
	"github.com/deloittepark/cqrs-microservices/pkg/kafka"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	"github.com/go-playground/validator"
	"github.com/gofiber/fiber/v2"
)

type server struct {
	log   logger.Logger
	cfg   *config.Config
	v     *validator.Validate
	mw    middlewares.MiddlewareManager
	fiber *fiber.App
	ps    *service.TodoService
}

func NewServer(log logger.Logger, cfg *config.Config) *server {
	return &server{log: log, cfg: cfg, fiber: fiber.New(), v: validator.New()}
}

func (s *server) Run() error {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM, syscall.SIGINT)
	defer cancel()

	s.mw = middlewares.NewMiddlewareManager(s.log, s.cfg)

	kafkaProducer := kafka.NewProducer(s.log, s.cfg.Kafka.Brokers)
	defer kafkaProducer.Close() // nolint: errcheck

	s.ps = service.NewTodoService(s.log, s.cfg, kafkaProducer)

	productHandlers := v1.NewTodosHandlers(s.fiber.Group(s.cfg.Http.TodosPath), s.log, s.mw, s.cfg, s.ps, s.v)
	productHandlers.MapRoutes()

	go func() {
		if err := s.runHttpServer(); err != nil {
			s.log.Errorf("s.runHttpServer: %v", err)
			cancel()
		}
	}()
	s.log.Infof("API Gateway is listening on PORT: %s", s.cfg.Http.Port)

	<-ctx.Done()
	if err := s.fiber.Server().ShutdownWithContext(ctx); err != nil {
		s.log.WarnMsg("fiber.Server.Shutdown", err)
	}

	return nil
}
