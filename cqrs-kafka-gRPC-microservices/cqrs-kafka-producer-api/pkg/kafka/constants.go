package kafka

import "time"

const (
	dialTimeout            = 3 * time.Minute
	minBytes               = 10e3 // 10KB
	maxBytes               = 10e6 // 10MB
	queueCapacity          = 100
	heartbeatInterval      = 3 * time.Second
	commitInterval         = 0
	partitionWatchInterval = 5 * time.Second
	maxAttempts            = 3
	maxWait                = 1 * time.Second

	writerReadTimeout  = 10 * time.Second
	writerWriteTimeout = 10 * time.Second
	writerRequiredAcks = -1
	writerMaxAttempts  = 3
)
