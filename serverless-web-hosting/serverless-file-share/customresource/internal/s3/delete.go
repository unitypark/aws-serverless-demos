package s3

import (
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func (s3s *s3Service) Delete(input *s3.DeleteObjectInput) (*string, error) {
	output, err := s3s.s3Client.DeleteObject(s3s.ctx, input)
	if err != nil {
		return nil, err
	}
	return output.VersionId, nil
}
