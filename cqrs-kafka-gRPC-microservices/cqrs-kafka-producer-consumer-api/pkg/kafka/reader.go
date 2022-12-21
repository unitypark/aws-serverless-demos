package kafka

import (
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	"github.com/wvanbergen/kafka/consumergroup"
)

// NewSyncProducer create new configured kafka SyncProducer
func NewReader(log logger.Logger, zookeeper []string, groupTopics []string, groupID string) *consumergroup.ConsumerGroup {
	config := consumergroup.NewConfig()
	config.Consumer.Return.Errors = true
	config.Consumer.Group.Heartbeat.Interval = heartbeatInterval
	config.Consumer.Group.Rebalance.Retry.Max = maxAttempts
	config.Consumer.MaxWaitTime = maxWait
	config.Net.DialTimeout = dialTimeout

	// join to consumer group
	cg, err := consumergroup.JoinConsumerGroup(groupID, groupTopics, zookeeper, config)

	log.Infof("NewReader groupID: %s, groupTopics: %v, zookeeper: %v", groupID, groupTopics, zookeeper)

	if err != nil {
		log.DPanicf("NewReader: %v", err)
	}

	return cg
}
