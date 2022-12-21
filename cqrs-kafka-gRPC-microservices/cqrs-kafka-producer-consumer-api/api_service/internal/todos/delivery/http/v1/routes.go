package v1

import (
	"github.com/gofiber/fiber/v2"
)

func (h *todosHandlers) MapRoutes() {
	h.router.Post("", h.CreateTodo())
	//h.group.GET("/:id", h.GetProductByID())
	//h.group.GET("/search", h.SearchProduct())
	h.router.Put("/:id", h.UpdateTodo())
	h.router.Delete("/:id", h.DeleteTodo())
	h.router.Use("/health", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})
}
