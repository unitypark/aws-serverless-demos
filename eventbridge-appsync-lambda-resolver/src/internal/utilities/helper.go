package utilities

import (
	"math/rand"
	"time"

	"github.com/oklog/ulid"
)

const TimeFormat string = time.RFC3339

func NewUlid(createdTime time.Time) string {
	entropy := ulid.Monotonic(rand.New(rand.NewSource(createdTime.UnixNano())), 0)
	return ulid.MustNew(ulid.Timestamp(createdTime), entropy).String()
}

func GetCurrentUTCTime() time.Time {
	loc, _ := time.LoadLocation("UTC")
	return time.Now().In(loc)
}
