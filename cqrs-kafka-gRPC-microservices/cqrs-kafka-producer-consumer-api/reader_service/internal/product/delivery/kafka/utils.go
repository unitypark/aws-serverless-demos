package kafka

import (
	"context"

	"github.com/Shopify/sarama"
	"github.com/wvanbergen/kafka/consumergroup"
)

func (s *readerMessageProcessor) commitMessage(ctx context.Context, cg *consumergroup.ConsumerGroup, msg *sarama.ConsumerMessage) {
	s.log.KafkaLogCommittedMessage(msg.Topic, int(msg.Partition), msg.Offset)

	if err := cg.CommitUpto(msg); err != nil {
		s.log.WarnMsg("commitMessage", err)
	}
}

func (s *readerMessageProcessor) logProcessMessage(msg *sarama.ConsumerMessage, workerID int) {
	s.log.KafkaProcessMessage(msg.Topic, int(msg.Partition), string(msg.Value), workerID, msg.Offset, msg.Timestamp)
}

func (s *readerMessageProcessor) commitErrMessage(ctx context.Context, cg *consumergroup.ConsumerGroup, msg *sarama.ConsumerMessage) {
	s.log.KafkaLogCommittedMessage(msg.Topic, int(msg.Partition), msg.Offset)

	if err := cg.CommitUpto(msg); err != nil {
		s.log.WarnMsg("commitMessage", err)
	}
}
