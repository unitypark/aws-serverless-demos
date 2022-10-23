package entities

import (
	"hash/fnv"
	"math/rand"
	"strconv"
	"time"
)

const (
	PK            string = "ID"
	GSI_INDEX     string = "Entities"
	GSI_PK        string = "Type"
	GSI_SK        string = "State"
	PREFIX        string = "URL#"
	Type          string = "URL"
	STATE_ACTVE   string = "ACTIVE"
	STATE_INACTVE string = "INACTVE"
	timeFormat    string = time.RFC3339
	Domain        string = "http://domain.io"
)

// Employee represents an employee entity object stored in the database
type Url struct {
	Id          string `json:"id" dynamodbav:"ID"`
	OriginalUrl string `json:"originalUrl" dynamodbav:"OriginalUrl,omitempty"`
	Path        string `json:"path" dynamodbav:"Path,omitempty"`
	CreatedAt   string `json:"createAt" dynamodbav:"CreatedAt,omitempty"`
	HitCount    int    `json:"hitCount" dynamodbav:"HitCount,omitempty"`
	Type        string `json:"type" dynamodbav:"Type,omitempty"`
	State       string `json:"state" dynamodbav:"State,omitempty"`
}

// DeleteRequest struct is used to parse Delete Reqeusts for Books
type PostUrlRequest struct {
	Url string `json:"url"`
}

func (u *Url) InitNewUrl(originalUrl *string) {
	rand.Seed(time.Now().UnixNano())
	id := hash(*originalUrl)
	u.Id = id
	u.OriginalUrl = *originalUrl
	u.Path = randSeq(10)
	u.CreatedAt = getCurrentUTCTime().Format(timeFormat)
	u.HitCount = 1
	u.Type = Type
	u.State = STATE_ACTVE
}

// generate hashed value based on given original url to be converted
func hash(s string) string {
	h := fnv.New64a()
	h.Write([]byte(s))
	return strconv.FormatUint(h.Sum64(), 10)
}

func randSeq(n int) string {
	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
	b := make([]rune, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}

// get current location based utc time
func getCurrentUTCTime() time.Time {
	loc, _ := time.LoadLocation("UTC")
	return time.Now().In(loc)
}
