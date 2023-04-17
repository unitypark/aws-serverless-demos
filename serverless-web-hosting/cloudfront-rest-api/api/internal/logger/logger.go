package logger

import (
	"errors"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	appConfig "github.com/deloittepark/serverless-file-share/internal/config"
)

// It initialize a default global zap logger in service
// Level in ZAP Logger (https://pkg.go.dev/go.uber.org/zap#pkg-constants)
func Init(env appConfig.Environment) {
	var zapConfig zap.Config
	switch env {
	case appConfig.Prod:
		// Logging all logstream which are higher than info level in json.
		zapConfig = zap.NewProductionConfig()
		zapConfig.Encoding = "json"
		zapConfig.EncoderConfig = zapcore.EncoderConfig{
			MessageKey: "message",

			LevelKey:    "level",
			EncodeLevel: zapcore.CapitalLevelEncoder,

			TimeKey:    "time",
			EncodeTime: zapcore.ISO8601TimeEncoder,

			CallerKey:    "caller",
			EncodeCaller: zapcore.ShortCallerEncoder,
		}
	case appConfig.Local:
		// Logging all logstream in every levels as string.
		zapConfig = zap.NewDevelopmentConfig()
		zapConfig.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	default:
		panic(errors.New("unvalid environment"))
	}

	zapLogger, err := zapConfig.Build()
	if err != nil {
		panic(err)
	}
	defer zapLogger.Sync()
	zap.ReplaceGlobals(zapLogger)
}
