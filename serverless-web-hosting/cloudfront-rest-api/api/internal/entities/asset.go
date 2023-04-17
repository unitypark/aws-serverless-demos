package entities

import (
	"hash/fnv"
	"math/rand"
	"path/filepath"
	"strconv"
	"time"

	"github.com/deloittepark/serverless-file-share/types"
	"github.com/oklog/ulid"
)

type Asset struct {
	PK         string `json:"pk" dynamodbav:"PK"`
	SK         string `json:"sk" dynamodbav:"SK"`
	AccessKey  string `json:"accessKey" dynamodbav:"AccessKey,omitempty"`
	Filename   string `json:"filename" dynamodbav:"Filename,omitempty"`
	Url        string `json:"url" dynamodbav:"Url,omitempty"`
	CreatedAt  string `json:"createAt" dynamodbav:"CreatedAt,omitempty"`
	ExpiringAt string `json:"expiringAt" dynamodbav:"ExpiringAt,omitempty"`
	ConsumedAt string `json:"consumedAt" dynamodbav:"ConsumedAt,omitempty"`
	HitCount   int    `json:"hitCount" dynamodbav:"HitCount,omitempty"`
	Type       string `json:"type" dynamodbav:"Type,omitempty"`
	State      string `json:"state" dynamodbav:"State,omitempty"`
}

type PostDownloadRequest struct {
	Path string `json:"path"`
}

func (u *Asset) InitNewAsset(urlType, path, url string, expiringMinutes int) {
	currentUTCTime := getCurrentUTCTime()
	ulid := getUlid(currentUTCTime)

	u.PK = path
	u.SK = ulid
	u.AccessKey = hash(ulid)
	u.Filename = filepath.Base(path)
	u.Url = url
	u.CreatedAt = currentUTCTime.Format(types.TIME_FORMAT)
	u.ExpiringAt = getExtendedTime(currentUTCTime, expiringMinutes).Format(types.TIME_FORMAT)
	u.ConsumedAt = ""
	u.HitCount = 0
	u.Type = urlType
	u.State = types.STATE_ACTVE
}

// generate hashed value based on given original url to be converted
func hash(ulid string) string {
	h := fnv.New64a()
	h.Write([]byte(ulid))
	return strconv.FormatUint(h.Sum64(), 10)
}

// get current location based utc time
func getCurrentUTCTime() time.Time {
	loc, _ := time.LoadLocation("UTC")
	return time.Now().In(loc)
}

func getExtendedTime(currentTime time.Time, expiringMinutes int) time.Time {
	return currentTime.Add(time.Minute * time.Duration(expiringMinutes))
}

func getUlid(currentTime time.Time) string {
	entropy := ulid.Monotonic(rand.New(rand.NewSource(currentTime.UnixNano())), 0)
	return ulid.MustNew(ulid.Timestamp(currentTime), entropy).String()
}
