package server

func (s *server) getConsumerGroupTopics() []string {
	return []string{
		s.cfg.KafkaTopics.TodoCreate.TopicName,
		s.cfg.KafkaTopics.TodoUpdate.TopicName,
		s.cfg.KafkaTopics.TodoDelete.TopicName,
	}
}
