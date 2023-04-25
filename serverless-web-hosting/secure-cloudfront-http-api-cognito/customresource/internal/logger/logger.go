package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// It initialize a default global zap logger in service
// Level in ZAP Logger (https://pkg.go.dev/go.uber.org/zap#pkg-constants)
func Init() {
	zapConfig := zap.NewProductionConfig()
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

	zapLogger, err := zapConfig.Build()
	if err != nil {
		panic(err)
	}
	defer zapLogger.Sync()
	zap.ReplaceGlobals(zapLogger)
}
