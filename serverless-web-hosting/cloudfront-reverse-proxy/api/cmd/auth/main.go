package main

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	jwt "github.com/golang-jwt/jwt/v4"
	"github.com/lestrrat/go-jwx/jwk"
	appConfig "github.com/unitypark/cloudfront-reverse-proxy/api/internal/config"
	zapLogger "github.com/unitypark/cloudfront-reverse-proxy/api/internal/logger"
	"go.uber.org/zap"
)

var (
	config                 *appConfig.Config
	accessTokenCookieRegex = regexp.MustCompile(`accessToken=(.*?);`)
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
	var authHeader, accessTokenValue string
	zap.L().Info("request", zap.Any("req", req))

	authHeader = findAuthHeader(req.Headers, []string{"cookie", "Cookie"})
	if authHeader == "" {
		zap.L().Info("authorization header value is missing")
		return generateResponse(false, nil), nil
	}

	matchedAccessToken := accessTokenCookieRegex.FindStringSubmatch(authHeader)
	if len(matchedAccessToken) == 2 {
		zap.L().Info("accessToken matches with regex")
		accessTokenValue = matchedAccessToken[1]
	} else {
		zap.L().Info("accessToken does not match with regex")
		return generateResponse(false, nil), nil
	}

	username, err := validateToken(accessTokenValue)
	if err != nil {
		zap.L().Error("authorizatoin failed", zap.Error(err))
		return generateResponse(false, nil), nil
	}

	return generateResponse(true, username), nil
}

func parseToken(token string) (*jwt.Token, error) {
	return jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
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
func generateResponse(isAuthorized bool, username *string) events.APIGatewayV2CustomAuthorizerSimpleResponse {
	if isAuthorized {
		response := events.APIGatewayV2CustomAuthorizerSimpleResponse{
			IsAuthorized: isAuthorized,
			Context: map[string]interface{}{
				"username": username,
			},
		}
		zap.L().Info("authorizer response", zap.Any("response", response))
		return response
	} else {
		return events.APIGatewayV2CustomAuthorizerSimpleResponse{
			IsAuthorized: isAuthorized,
		}
	}
}

func validateToken(accessToken string) (*string, error) {
	parsedToken, err := parseToken(accessToken)
	if err != nil {
		return nil, err
	}
	zap.L().Info("parsedAccessToken", zap.Any("parsedAccessToken", parsedToken))

	mapClaims := parsedToken.Claims.(jwt.MapClaims)
	zap.L().Info("mapClaims", zap.Any("mapClaims", mapClaims))

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
	// validate "client_id"
	checkClient := mapClaims["client_id"] == config.ClientId
	if !checkClient {
		return nil, fmt.Errorf("invalid app client")
	}
	username := mapClaims["username"].(string)
	return &username, nil
}
