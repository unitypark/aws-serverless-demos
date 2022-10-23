package utilities

import (
	"math/rand"
	"time"

	"github.com/oklog/ulid"
)

const TimeFormat string = time.RFC3339

func NewUlid() string {
	loc, _ := time.LoadLocation("UTC")
	createdTime := time.Now().In(loc)
	entropy := ulid.Monotonic(rand.New(rand.NewSource(createdTime.UnixNano())), 0)
	return ulid.MustNew(ulid.Timestamp(createdTime), entropy).String()
}
