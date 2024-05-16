package entities

import (
	"hash/fnv"
	"math/rand"
	"path/filepath"
	"strconv"
	"time"

	"github.com/oklog/ulid"
	"github.com/unitypark/cloudfront-reverse-proxy/api/types"
)

type Asset struct {
	PK         string `json:"pk" dynamodbav:"PK"`
	SK         string `json:"sk" dynamodbav:"SK"`
	AccessKey  string `json:"accessKey" dynamodbav:"AccessKey,omitempty"`
	Filename   string `json:"filename" dynamodbav:"Filename,omitempty"`
	Url        string `json:"url" dynamodbav:"Url,omitempty"`
	CreatedAt  string `json:"createAt" dynamodbav:"CreatedAt,omitempty"`
	CreatedBy  string `json:"createdBy" dynamodbav:"CreatedBy,omitempty"`
	ExpiringAt string `json:"expiringAt" dynamodbav:"ExpiringAt,omitempty"`
	AccessedAt string `json:"accessedAt" dynamodbav:"AccessedAt,omitempty"`
	AccessedBy string `json:"accessedBy" dynamodbav:"AccessedBy,omitempty"`
}

func (u *Asset) InitNewUploadAsset(path, url, username string, expiringMinutes int) {
	currentUTCTime := GetCurrentUTCTime()
	ulid := GetUlid(currentUTCTime)

	u.PK = path
	u.SK = ulid
	u.Filename = filepath.Base(path)
	u.Url = url
	u.CreatedAt = currentUTCTime.Format(types.TIME_FORMAT)
	u.CreatedBy = username
	u.ExpiringAt = GetExtendedTime(currentUTCTime, expiringMinutes).Format(types.TIME_FORMAT)
}

func (u *Asset) InitNewDownloadAsset(path, url, username string, expiringMinutes int) {
	currentUTCTime := GetCurrentUTCTime()
	ulid := GetUlid(currentUTCTime)

	u.PK = path
	u.SK = ulid
	u.AccessKey = hash(ulid)
	u.Filename = filepath.Base(path)
	u.Url = url
	u.CreatedAt = currentUTCTime.Format(types.TIME_FORMAT)
	u.CreatedBy = username
	u.ExpiringAt = GetExtendedTime(currentUTCTime, expiringMinutes).Format(types.TIME_FORMAT)
	u.AccessedAt = "INIT"
	u.AccessedBy = "INIT"
}

// generate hashed value based on given original url to be converted
func hash(ulid string) string {
	h := fnv.New64a()
	h.Write([]byte(ulid))
	return strconv.FormatUint(h.Sum64(), 10)
}

// get current location based utc time
func GetCurrentUTCTime() time.Time {
	loc, _ := time.LoadLocation("UTC")
	return time.Now().In(loc)
}

func GetExtendedTime(currentTime time.Time, expiringMinutes int) time.Time {
	return currentTime.Add(time.Minute * time.Duration(expiringMinutes))
}

func GetUlid(currentTime time.Time) string {
	entropy := ulid.Monotonic(rand.New(rand.NewSource(currentTime.UnixNano())), 0)
	return ulid.MustNew(ulid.Timestamp(currentTime), entropy).String()
}
