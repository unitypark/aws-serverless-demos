package v1

import (
	"net/http"

	"github.com/deloittepark/cqrs-microservices/api_service/config"
	"github.com/deloittepark/cqrs-microservices/api_service/internal/dto"
	"github.com/deloittepark/cqrs-microservices/api_service/internal/middlewares"
	"github.com/deloittepark/cqrs-microservices/api_service/internal/todos/commands"
	"github.com/deloittepark/cqrs-microservices/api_service/internal/todos/service"
	"github.com/deloittepark/cqrs-microservices/pkg/constants"
	httpErrors "github.com/deloittepark/cqrs-microservices/pkg/http_errors"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	"github.com/go-playground/validator"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type todosHandlers struct {
	router fiber.Router
	log    logger.Logger
	mw     middlewares.MiddlewareManager
	cfg    *config.Config
	ps     *service.TodoService
	v      *validator.Validate
}

func NewTodosHandlers(
	router fiber.Router,
	log logger.Logger,
	mw middlewares.MiddlewareManager,
	cfg *config.Config,
	ps *service.TodoService,
	v *validator.Validate,
) *todosHandlers {
	return &todosHandlers{router: router, log: log, mw: mw, cfg: cfg, ps: ps, v: v}
}

// CreateTodo
// @Tags Todos
// @Summary Create Todo
// @Description Create new Todo item
// @Accept json
// @Produce json
// @Param data body dto.CreateTodoDto true "Todo"
// @Success 201 {object} dto.CreateTodoResponseDto
// @Router /todos [post]
func (h *todosHandlers) CreateTodo() fiber.Handler {
	return func(ctx *fiber.Ctx) error {
		createDto := new(dto.CreateTodoDto)
		err := ctx.BodyParser(createDto)
		if err != nil {
			ctx.Status(http.StatusBadRequest)
			return httpErrors.ErrorCtxResponse(ctx, err, h.cfg.Http.DebugErrorsResponse)
		}
		createDto.ID = uuid.New()

		if err := h.v.StructCtx(ctx.Context(), createDto); err != nil {
			h.log.WarnMsg("validate", err)
			return httpErrors.ErrorCtxResponse(ctx, err, h.cfg.Http.DebugErrorsResponse)
		}

		if err := h.ps.Commands.CreateTodo.Handle(ctx.Context(), commands.NewCreateTodoCommand(createDto)); err != nil {
			h.log.WarnMsg("CreateTodo", err)
			return httpErrors.ErrorCtxResponse(ctx, err, h.cfg.Http.DebugErrorsResponse)
		}
		ctx.Status(http.StatusCreated)
		return ctx.JSON(dto.CreateTodoResponseDto{ID: createDto.ID})
	}
}

// GetTodoByID
// @Tags Todos
// @Summary Get Todo
// @Description Get Todo by id
// @Accept json
// @Produce json
// @Param id path string true "Todo ID"
// @Success 200 {object} dto.TodoResponse
// @Router /todos/{id} [get]
/* func (h *todosHandlers) GetTodoByID() echo.HandlerFunc {
	return func(c *fiber.Ctx) error {
		h.metrics.GetTodoByIdHttpRequests.Inc()

		ctx, span := tracing.StartHttpServerTracerSpan(c, "TodosHandlers.GetTodoByID")
		defer span.Finish()

		TodoUUID, err := uuid.FromString(c.Param(constants.ID))
		if err != nil {
			h.log.WarnMsg("uuid.FromString", err)
			h.traceErr(span, err)
			return httpErrors.ErrorCtxResponse(c, err, h.cfg.Http.DebugErrorsResponse)
		}

		query := queries.NewGetTodoByIdQuery(TodoUUID)
		response, err := h.ps.Queries.GetTodoById.Handle(ctx, query)
		if err != nil {
			h.log.WarnMsg("GetTodoById", err)
			h.metrics.ErrorHttpRequests.Inc()
			return httpErrors.ErrorCtxResponse(c, err, h.cfg.Http.DebugErrorsResponse)
		}

		h.metrics.SuccessHttpRequests.Inc()
		return c.JSON(http.StatusOK, response)
	}
} */

// SearchTodo
// @Tags Todos
// @Summary Search Todo
// @Description Get Todo by name with pagination
// @Accept json
// @Produce json
// @Param search query string false "search text"
// @Param page query string false "page number"
// @Param size query string false "number of elements"
// @Success 200 {object} dto.TodosListResponse
// @Router /todos/search [get]
/* func (h *todosHandlers) SearchTodo() echo.HandlerFunc {
	return func(c *fiber.Ctx) error {
		h.metrics.SearchTodoHttpRequests.Inc()

		ctx, span := tracing.StartHttpServerTracerSpan(c, "TodosHandlers.SearchTodo")
		defer span.Finish()

		pq := utils.NewPaginationFromQueryParams(c.QueryParam(constants.Size), c.QueryParam(constants.Page))

		query := queries.NewSearchTodoQuery(c.QueryParam(constants.Search), pq)
		response, err := h.ps.Queries.SearchTodo.Handle(ctx, query)
		if err != nil {
			h.log.WarnMsg("SearchTodo", err)
			h.metrics.ErrorHttpRequests.Inc()
			return httpErrors.ErrorCtxResponse(c, err, h.cfg.Http.DebugErrorsResponse)
		}

		h.metrics.SuccessHttpRequests.Inc()
		return c.JSON(http.StatusOK, response)
	}
} */

// UpdateTodo
// @Tags Todos
// @Summary Update Todo
// @Description Update existing Todo
// @Accept json
// @Produce json
// @Param id path string true "Todo ID"
// @Param data body dto.UpdateTodoDto true "Todo"
// @Success 200 {object} dto.UpdateTodoDto
// @Router /todos/{id} [put]
func (h *todosHandlers) UpdateTodo() fiber.Handler {
	return func(ctx *fiber.Ctx) error {
		todoUUID, err := uuid.Parse(ctx.Params(constants.ID))
		if err != nil {
			h.log.WarnMsg("uuid.FromString", err)
			return httpErrors.ErrorCtxResponse(ctx, err, h.cfg.Http.DebugErrorsResponse)
		}
		updateDto := new(dto.UpdateTodoDto)
		err = ctx.BodyParser(updateDto)
		if err != nil {
			ctx.Status(http.StatusBadRequest)
			return httpErrors.ErrorCtxResponse(ctx, err, h.cfg.Http.DebugErrorsResponse)
		}
		updateDto.ID = todoUUID

		if err := h.v.StructCtx(ctx.Context(), updateDto); err != nil {
			h.log.WarnMsg("validate", err)
			return httpErrors.ErrorCtxResponse(ctx, err, h.cfg.Http.DebugErrorsResponse)
		}

		if err := h.ps.Commands.UpdateTodo.Handle(ctx.Context(), commands.NewUpdateTodoCommand(updateDto)); err != nil {
			h.log.WarnMsg("UpdateTodo", err)
			return httpErrors.ErrorCtxResponse(ctx, err, h.cfg.Http.DebugErrorsResponse)
		}
		ctx.Status(http.StatusOK)
		return ctx.JSON(updateDto)
	}
}

// DeleteTodo
// @Tags Todos
// @Summary Delete Todo
// @Description Delete existing Todo
// @Accept json
// @Produce json
// @Success 200 ""
// @Param id path string true "Todo ID"
// @Router /todos/{id} [delete]
func (h *todosHandlers) DeleteTodo() fiber.Handler {
	return func(ctx *fiber.Ctx) error {
		todoUUID, err := uuid.Parse(ctx.Params(constants.ID))
		if err != nil {
			h.log.WarnMsg("uuid.FromString", err)
			return httpErrors.ErrorCtxResponse(ctx, err, h.cfg.Http.DebugErrorsResponse)
		}

		if err := h.ps.Commands.DeleteTodo.Handle(ctx.Context(), commands.NewDeleteTodoCommand(todoUUID)); err != nil {
			h.log.WarnMsg("DeleteTodo", err)
			return httpErrors.ErrorCtxResponse(ctx, err, h.cfg.Http.DebugErrorsResponse)
		}
		ctx.Status(http.StatusOK)
		return nil
	}
}
