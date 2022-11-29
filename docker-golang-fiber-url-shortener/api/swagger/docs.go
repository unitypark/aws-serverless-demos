// Package swagger GENERATED BY SWAG; DO NOT EDIT
// This file was generated by swaggo/swag
package swagger

import "github.com/swaggo/swag"

const docTemplate = `{
    "swagger": "2.0",
    "info": {
      "description": "This is the backend rest api swagger documentation for url shortener application. You can find out more about this API implementation on [GitHub](https://github.com/deloittepark/aws-serverless-golang/tree/main/docker-golang-fiber-url-shortener).",
      "version": "1.0.0",
      "title": "url-shortener"
    },
    "tags": [
      {
        "name": "urls",
        "description": "This endpoint will work with UserService in backend"
      },
      {
        "name": "root",
        "description": "This endpoint will work with AccountService in backend"
      }
    ],
    "definitions": {
      "dto.urls": {
        "type": "object",
        "properties": {
          "data": {
            "type": "object",
            "properties": {
              "urls": {
                "type": "array",
                "items": {
                  "$ref": "#/definitions/dto.url"
                }
              }
            }
          }
        }
      },
      "dto.url": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Id of url."
          },
          "url": {
            "type": "string",
            "description": "original url."
          },
          "path": {
            "type": "string",
            "description": "shortened path."
          }
        }
      }
    },
    "paths": {
      "/": {
        "get": {
          "tags": [
            "root"
          ],
          "summary": "",
          "description": "Vital check of the api",
          "operationId": "HealthCheck",
          "produces": [
            "application/json"
          ],
          "responses": {
            "200": {
              "description": "OK"
            }
          }
        }
      },
      "/urls": {
        "get": {
          "tags": [
            "urls"
          ],
          "summary": "",
          "description": "Get all urls from DynamoDB table",
          "operationId": "GetUrls",
          "produces": [
            "application/json"
          ],
          "responses": {
            "200": {
              "description": "successful operation",
              "schema": {
                "$ref": "#/definitions/dto.urls"
              }
            },
            "500": {
              "description": "Unexpected internal server error"
            }
          }
        },
        "post": {
          "tags": [
            "urls"
          ],
          "summary": "",
          "description": "Create a shortened url",
          "operationId": "PostUrl",
          "produces": [
            "application/json"
          ],
          "parameters": [
            {
              "in": "body",
              "name": "url",
              "description": "Value of original url.",
              "schema": {
                "type": "object",
                "required": [
                  "url"
                ],
                "properties": {
                  "url": {
                    "type": "string"
                  }
                }
              }
            }
          ],
          "responses": {
            "200": {
              "description": "successful operation",
              "schema": {
                "$ref": "#/definitions/dto.url"
              }
            },
            "500": {
              "description": "Unexpected internal server error"
            }
          }
        }
      },
      "/urls/{path}": {
        "get": {
          "tags": [
            "urls"
          ],
          "summary": "",
          "description": "Delete the terminated account item permanently from the DynamoDb",
          "operationId": "AccountService/DeleteAccount",
          "produces": [
            "application/json"
          ],
          "parameters": [
            {
              "name": "path",
              "in": "path",
              "description": "shortened path of generated url",
              "required": true,
              "type": "string"
            }
          ],
          "responses": {
            "200": {
              "description": "successful operation",
              "schema": {
                "$ref": "#/definitions/dto.url"
              }
            },
            "500": {
              "description": "Unexpected internal server error"
            }
          }
        }
      }
    }
  }`

// SwaggerInfo holds exported Swagger Info so clients can modify it
var SwaggerInfo = &swag.Spec{
	Version:          "2.0",
	Host:             "localhost:8080",
	BasePath:         "/",
	Schemes:          []string{"http"},
	Title:            "Fiber Swagger Example API",
	Description:      "This is a sample server server.",
	InfoInstanceName: "swagger",
	SwaggerTemplate:  docTemplate,
}

func init() {
	swag.Register(SwaggerInfo.InstanceName(), SwaggerInfo)
}
