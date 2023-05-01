package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	jwt "github.com/golang-jwt/jwt/v4"
	"github.com/lestrrat/go-jwx/jwk"
	appConfig "github.com/unitypark/cloudfront-http-api-cognito/internal/config"
	zapLogger "github.com/unitypark/cloudfront-http-api-cognito/internal/logger"
	"go.uber.org/zap"
)

const (
	ALLOWED_API_METHOD string = "GET"
)

var (
	config *appConfig.Config
)

func init() {
	config = appConfig.New()
	zapLogger.Init(config.Env)
	zap.L().Info("lambda cold start")
}

func main() {
	lambda.Start(handler)
}

func handler(ctx context.Context, req events.APIGatewayV2CustomAuthorizerV2Request) (events.APIGatewayV2CustomAuthorizerSimpleResponse, error) {
	isAdmin := false
	mapClaims, isAdmin, err := validateIdToken(req.Headers["authorization"], isAdmin)
	if err != nil {
		zap.L().Error("authorizatoin failed", zap.Error(err))
		return generateResponse(false, mapClaims), nil
	}

	if !isAdmin && req.RequestContext.HTTP.Method != ALLOWED_API_METHOD {
		zap.L().Info("authorizatoin denied")
		zap.L().Info("non admin user may call only GET method", zap.String("method", req.RequestContext.HTTP.Method))
		return generateResponse(false, mapClaims), nil
	}
	return generateResponse(true, mapClaims), nil
}

// Help function to generate an IAM policy
func generateResponse(isAuthorized bool, mapClaims jwt.MapClaims) events.APIGatewayV2CustomAuthorizerSimpleResponse {
	return events.APIGatewayV2CustomAuthorizerSimpleResponse{
		IsAuthorized: isAuthorized,
		Context: map[string]interface{}{
			"username": mapClaims["cognito:username"],
			"role":     mapClaims["custom:role"],
		},
	}
}

func validateIdToken(token string, isAdmin bool) (jwt.MapClaims, bool, error) {
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		set, err := jwk.FetchHTTP(config.JwksUrl)
		if err != nil {
			return nil, err
		}

		keyID, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("expecting JWT header to have string kid")
		}

		if key := set.LookupKeyID(keyID); len(key) == 1 {
			return key[0].Materialize()
		}
		return nil, errors.New("unable to find key")
	})
	if err != nil {
		return nil, isAdmin, err
	}
	if err != nil {
		return nil, isAdmin, err
	}
	mapClaims := parsedToken.Claims.(jwt.MapClaims)
	// validate "iat"
	checkIat := mapClaims.VerifyIssuedAt(time.Now().Unix(), true)
	if !checkIat {
		return nil, isAdmin, fmt.Errorf("token issued at error")
	}
	// validate "exp"
	checkExp := mapClaims.VerifyExpiresAt(time.Now().Unix(), true)
	if !checkExp {
		return nil, isAdmin, fmt.Errorf("token expired")
	}
	// validate "iss"
	checkIss := mapClaims.VerifyIssuer(config.TokenIss, true)
	if !checkIss {
		return nil, isAdmin, fmt.Errorf("invalid issuer")
	}
	// validate "aud"
	checkAud := mapClaims.VerifyAudience(config.TokenAud, true)
	if !checkAud {
		return nil, isAdmin, fmt.Errorf("invalid audience")
	}
	customRole := mapClaims["custom:role"].(string)
	if customRole == config.AdminRoleName {
		isAdmin = true
	}
	return mapClaims, isAdmin, nil
}
