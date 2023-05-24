package main

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	jwt "github.com/golang-jwt/jwt/v4"
	"github.com/lestrrat/go-jwx/jwk"
	appConfig "github.com/unitypark/serverless-file-share/lambda/api/internal/config"
	zapLogger "github.com/unitypark/serverless-file-share/lambda/api/internal/logger"
	"go.uber.org/zap"
)

var (
	config      *appConfig.Config
	cookieRegex = regexp.MustCompile(`idToken=(.+?)(;)`)
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
	authHeader := findAuthHeader(req.Headers, []string{"cookie", "Cookie"})
	extractedIdTokenCookie := cookieRegex.FindString(authHeader)
	if extractedIdTokenCookie == "" {
		zap.L().Info("id token is missing")
		return generateResponse(false, nil), nil
	}

	idTokenCookie := strings.TrimSuffix(extractedIdTokenCookie, ";")
	idTokenValue := strings.Split(idTokenCookie, "=")[1]

	mapClaims, err := validateIdToken(idTokenValue)
	if err != nil {
		zap.L().Error("authorizatoin failed", zap.Error(err))
		return generateResponse(false, mapClaims), nil
	}
	return generateResponse(true, mapClaims), nil
}

func findAuthHeader(headers map[string]string, authHeaderNames []string) string {
	var authHeader string
	for _, key := range authHeaderNames {
		authHeader = headers[key]
		if authHeader != "" {
			break
		}
	}
	return authHeader
}

// Help function to generate an IAM policy
func generateResponse(isAuthorized bool, mapClaims jwt.MapClaims) events.APIGatewayV2CustomAuthorizerSimpleResponse {
	return events.APIGatewayV2CustomAuthorizerSimpleResponse{
		IsAuthorized: isAuthorized,
		Context: map[string]interface{}{
			"username": mapClaims["email"],
			"isAdmin":  isAdmin(mapClaims["custom:isAdmin"].(string)),
		},
	}
}

func isAdmin(isAdmin string) bool {
	res, _ := strconv.ParseBool(isAdmin)
	return res
}

func validateIdToken(token string) (jwt.MapClaims, error) {
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
		return nil, err
	}
	if err != nil {
		return nil, err
	}
	mapClaims := parsedToken.Claims.(jwt.MapClaims)
	// validate "iat"
	checkIat := mapClaims.VerifyIssuedAt(time.Now().Unix(), true)
	if !checkIat {
		return nil, fmt.Errorf("token issued at error")
	}
	// validate "exp"
	checkExp := mapClaims.VerifyExpiresAt(time.Now().Unix(), true)
	if !checkExp {
		return nil, fmt.Errorf("token expired")
	}
	// validate "iss"
	checkIss := mapClaims.VerifyIssuer(config.TokenIss, true)
	if !checkIss {
		return nil, fmt.Errorf("invalid issuer")
	}
	// validate "aud"
	checkAud := mapClaims.VerifyAudience(config.TokenAud, true)
	if !checkAud {
		return nil, fmt.Errorf("invalid audience")
	}
	return mapClaims, nil
}