package kafka

import (
	"context"
	"sync"

	"github.com/Shopify/sarama"
	"github.com/deloittepark/cqrs-microservices/pkg/logger"
	"github.com/wvanbergen/kafka/consumergroup"
)

// MessageProcessor processor methods must implement kafka.Worker func method interface
type MessageProcessor interface {
	ProcessMessages(ctx context.Context, cg *consumergroup.ConsumerGroup, wg *sync.WaitGroup, workerID int)
}

// Worker kafka consumer worker fetch and process messages from reader
type Worker func(ctx context.Context, cg *consumergroup.ConsumerGroup, wg *sync.WaitGroup, workerID int)

type ConsumerGroup interface {
	ConsumeTopic(ctx context.Context, cancel context.CancelFunc, groupID, topic string, poolSize int, worker Worker)
	GetNewKafkaReader(kafkaURL []string, topic, groupID string) sarama.ConsumerGroup
	GetNewKafkaWriter(topic string) sarama.SyncProducer
}

type consumerGroup struct {
	brokers    []string
	zookeepers []string
	groupID    string
	log        logger.Logger
}

// NewConsumerGroup kafka consumer group constructor
func NewConsumerGroup(brokers []string, zookeepers []string, groupID string, log logger.Logger) *consumerGroup {
	return &consumerGroup{brokers: brokers, zookeepers: zookeepers, groupID: groupID, log: log}
}

// GetNewKafkaReader create new kafka reader
func (cg *consumerGroup) GetNewKafkaReader(groupTopics []string, groupID string) *consumergroup.ConsumerGroup {
	return NewReader(cg.log, cg.zookeepers, groupTopics, groupID)
}

// GetNewKafkaWriter create new kafka producer
func (cg *consumerGroup) GetNewKafkaWriter() sarama.SyncProducer {
	return NewWriter(cg.log, cg.brokers)
}

// ConsumeTopic start consumer group with given worker and pool size
func (cg *consumerGroup) ConsumeTopic(ctx context.Context, groupTopics []string, poolSize int, worker Worker) {
	r := cg.GetNewKafkaReader(groupTopics, cg.groupID)

	defer func() {
		if err := r.Close(); err != nil {
			cg.log.Warnf("consumerGroup.r.Close: %v", err)
		}
	}()

	cg.log.Infof("Starting consumer groupID: %s, topic: %+v, pool size: %v", cg.groupID, groupTopics, poolSize)

	wg := &sync.WaitGroup{}
	for i := 0; i <= poolSize; i++ {
		wg.Add(1)
		go worker(ctx, r, wg, i)
	}
	wg.Wait()
}
