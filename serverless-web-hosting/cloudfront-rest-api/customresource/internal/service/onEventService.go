package service

import (
	"bytes"
	"context"
	"encoding/json"

	"github.com/aws/aws-lambda-go/cfn"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/deloittepark/serverless-file-share-customresource/internal/config"
	s3Service "github.com/deloittepark/serverless-file-share-customresource/internal/s3"
	"go.uber.org/zap"
)

type (
	OnEventServiceIface interface {
		OnCreateEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error)
		OnUpdateEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error)
		OnDeleteEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error)
	}
	onEventService struct {
		config    *config.Config
		s3Service s3Service.S3ServiceIface
	}
)

func NewOnEventService(config *config.Config, s3Service s3Service.S3ServiceIface) OnEventServiceIface {
	return &onEventService{
		config:    config,
		s3Service: s3Service,
	}
}

func (crs *onEventService) OnCreateEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error) {
	err = crs.config.Init(event.ResourceProperties)
	if err != nil {
		return
	}
	versionId, err := crs.uploadRuntimeConfig()
	if err != nil {
		zap.L().Error("unexpected error during uploading runtime config file", zap.Error(err))
		return
	}
	physicalResourceID = *versionId
	return
}

func (crs *onEventService) OnUpdateEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error) {
	err = crs.config.Init(event.ResourceProperties)
	if err != nil {
		return
	}
	_, err = crs.uploadRuntimeConfig()
	if err != nil {
		zap.L().Error("unexpected error during uploading runtime config file", zap.Error(err))
		return
	}
	return
}

func (crs *onEventService) OnDeleteEvent(ctx context.Context, event cfn.Event) (physicalResourceID string, data map[string]interface{}, err error) {
	err = crs.config.Init(event.ResourceProperties)
	if err != nil {
		return
	}
	versionId, err := crs.deleteRuntimeConfig()
	if err != nil {
		zap.L().Error("unexpected error during uploading runtime config file", zap.Error(err))
		return
	}
	physicalResourceID = *versionId
	return
}

func (crs *onEventService) uploadRuntimeConfig() (*string, error) {
	jsonMap, err := json.MarshalIndent(crs.config.ReactRuntimeConfig, "", " ")
	if err != nil {
		return nil, err
	}
	return crs.s3Service.Upload(&s3.PutObjectInput{
		Bucket: &crs.config.FrontendBucketName,
		Key:    &crs.config.RuntimeConfigFileName,
		Body:   bytes.NewReader(jsonMap),
	})
}

func (crs *onEventService) deleteRuntimeConfig() (*string, error) {
	return crs.s3Service.Delete(&s3.DeleteObjectInput{
		Bucket: &crs.config.FrontendBucketName,
		Key:    &crs.config.RuntimeConfigFileName,
	})
}
