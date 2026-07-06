package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Topic;
import de.thaizen.webforum.repository.PostRepository;
import de.thaizen.webforum.repository.TopicRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TopicService {
    private final TopicRepository topicRepository;
    private final PostRepository postRepository;

    public TopicService(TopicRepository topicRepository, PostRepository postRepository) {
        this.topicRepository = topicRepository;
        this.postRepository = postRepository;
    }

    public Topic createTopic(Topic topic) {
        LocalDateTime now = LocalDateTime.now();

        if (topic.getCreatedAt() == null) {
            topic.setCreatedAt(now);
        }
        topic.setUpdatedAt(now);

        return topicRepository.save(topic);
    }

    public List<Topic> getAllTopics() {
        return topicRepository.findAll();
    }

    public Topic getTopicById(Long id) {
        return topicRepository.findById(id)
                .orElse(null);
    }

    public Topic updateTopic(Long id, Topic topic) {
        Topic existingTopic = topicRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Thema nicht gefunden."));

        existingTopic.setTitle(topic.getTitle());
        existingTopic.setContent(topic.getContent());
        existingTopic.setClosed(topic.isClosed());

        if (topic.getAuthor() != null) {
            existingTopic.setAuthor(topic.getAuthor());
        }

        existingTopic.setUpdatedAt(LocalDateTime.now());

        return topicRepository.save(existingTopic);
    }

    public void closeTopic(Long id) {
        Topic topic = topicRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Thema nicht gefunden."));

        topic.setClosed(true);
        topic.setUpdatedAt(LocalDateTime.now());

        topicRepository.save(topic);
    }

    @Transactional
    public void deleteTopic(Long id) {
        postRepository.deleteByTopic_Id(id);
        topicRepository.deleteById(id);
    }
}
