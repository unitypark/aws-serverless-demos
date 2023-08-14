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
	appConfig "github.com/unitypark/oatuh2-cognito-best-practice/lambda/api/internal/config"
	zapLogger "github.com/unitypark/oatuh2-cognito-best-practice/lambda/api/internal/logger"
	"go.uber.org/zap"
)

var (
	config                 *appConfig.Config
	accessTokenCookieRegex = regexp.MustCompile(`accessToken=(.+?)(;)`)
	idTokenCookieRegex     = regexp.MustCompile(`idToken=(.+?)(;)`)
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
	accessToken, err := getToken(accessTokenCookieRegex, authHeader)
	if err != nil {
		return generateResponse(false, nil), nil
	}
	idToken, err := getToken(idTokenCookieRegex, authHeader)
	if err != nil {
		return generateResponse(false, nil), nil
	}

	err = validateToken(*accessToken)
	if err != nil {
		zap.L().Error("authorizatoin failed", zap.Error(err))
		return generateResponse(false, idToken), nil
	}
	return generateResponse(true, idToken), nil
}

func getToken(regex *regexp.Regexp, authHeader string) (*string, error) {
	extractedToken := regex.FindString(authHeader)
	if extractedToken == "" {
		zap.L().Info("token not found")
		return nil, errors.New("token not found")
	}
	token := strings.Split(strings.TrimSuffix(extractedToken, ";"), "=")[1]
	return &token, nil
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
func generateResponse(isAuthorized bool, idToken *string) events.APIGatewayV2CustomAuthorizerSimpleResponse {
	if isAuthorized {
		parsedIdToken, _ := parseToken(*idToken)
		return events.APIGatewayV2CustomAuthorizerSimpleResponse{
			IsAuthorized: isAuthorized,
			Context: map[string]interface{}{
				"username": parsedIdToken.Claims.(jwt.MapClaims)["email"],
				"isAdmin":  isAdmin(parsedIdToken.Claims.(jwt.MapClaims)["custom:isAdmin"].(string)),
			},
		}
	} else {
		return events.APIGatewayV2CustomAuthorizerSimpleResponse{
			IsAuthorized: isAuthorized,
		}
	}
}

func isAdmin(isAdmin string) bool {
	res, _ := strconv.ParseBool(isAdmin)
	return res
}

func validateToken(token string) error {
	zap.L().Info("config", zap.Any("config", config))

	parsedToken, err := parseToken(token)
	if err != nil {
		return err
	}
	zap.L().Info("parsedToken", zap.Any("parsedToken", parsedToken))

	mapClaims := parsedToken.Claims.(jwt.MapClaims)
	zap.L().Info("mapClaims", zap.Any("mapClaims", mapClaims))

	// validate "iat"
	checkIat := mapClaims.VerifyIssuedAt(time.Now().Unix(), true)
	if !checkIat {
		return fmt.Errorf("token issued at error")
	}
	// validate "exp"
	checkExp := mapClaims.VerifyExpiresAt(time.Now().Unix(), true)
	if !checkExp {
		return fmt.Errorf("token expired")
	}
	// validate "iss"
	checkIss := mapClaims.VerifyIssuer(config.TokenIss, true)
	if !checkIss {
		return fmt.Errorf("invalid issuer")
	}
	// validate "aud"
	mapClaims["aud"] = mapClaims["client_id"]
	checkAud := mapClaims.VerifyAudience(config.TokenAud, true)
	if !checkAud {
		return fmt.Errorf("invalid audience")
	}
	return nil
}
