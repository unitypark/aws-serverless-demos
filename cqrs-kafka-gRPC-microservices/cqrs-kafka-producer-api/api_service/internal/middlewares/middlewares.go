package middlewares

import (
	"strings"
	"time"

	"github.com/deloittepark/cqrs-microservices/api_service/config"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	"github.com/gofiber/fiber/v2"
)

type MiddlewareManager interface {
	RequestLoggerMiddleware() fiber.Handler
}

type middlewareManager struct {
	log logger.Logger
	cfg *config.Config
}

func NewMiddlewareManager(log logger.Logger, cfg *config.Config) *middlewareManager {
	return &middlewareManager{log: log, cfg: cfg}
}

func (mw *middlewareManager) RequestLoggerMiddleware() fiber.Handler {
	return func(ctx *fiber.Ctx) error {
		start := time.Now()

		req := ctx.Request()
		res := ctx.Response()
		status := res.StatusCode()
		size := int64(res.Header.ContentLength())
		s := time.Since(start)

		if !mw.checkIgnoredURI(string(ctx.Request().RequestURI()), mw.cfg.Http.IgnoreLogUrls) {
			mw.log.HttpMiddlewareAccessLogger(string(req.Header.Method()), req.URI().String(), status, size, s)
		}
		return nil
	}
}

func (mw *middlewareManager) checkIgnoredURI(requestURI string, uriList []string) bool {
	for _, s := range uriList {
		if strings.Contains(requestURI, s) {
			return true
		}
	}
	return false
}
