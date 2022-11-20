package s3

import (
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func (s3s *s3Service) Upload(input *s3.PutObjectInput) (*string, error) {
	uploader := s3s.getUploadManager()
	output, err := uploader.Upload(s3s.ctx, input)
	if err != nil {
		return nil, err
	}
	return output.VersionID, nil
}
