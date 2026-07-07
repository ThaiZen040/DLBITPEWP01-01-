package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Topic;
import de.thaizen.webforum.model.User;
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
    private final ForumPermissionService forumPermissionService;

    public TopicService(TopicRepository topicRepository,
                        PostRepository postRepository,
                        ForumPermissionService forumPermissionService) {
        this.topicRepository = topicRepository;
        this.postRepository = postRepository;
        this.forumPermissionService = forumPermissionService;
    }

    public Topic createTopic(Long actorId, Topic topic) {
        User actor = forumPermissionService.requireAuthenticatedUser(actorId);
        LocalDateTime now = LocalDateTime.now();

        if (topic.getCreatedAt() == null) {
            topic.setCreatedAt(now);
        }
        topic.setAuthor(actor);
        topic.setUpdatedAt(now);

        return topicRepository.save(topic);
    }

    public List<Topic> getAllTopics() {
        return topicRepository.findAll();
    }

    public Topic updateTopic(Long actorId, Long id, Topic topic) {
        User actor = forumPermissionService.requireAuthenticatedUser(actorId);
        Topic existingTopic = topicRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Thema nicht gefunden."));
        forumPermissionService.assertCanManageTopic(actor, existingTopic);

        existingTopic.setTitle(topic.getTitle());
        existingTopic.setContent(topic.getContent());

        existingTopic.setUpdatedAt(LocalDateTime.now());

        return topicRepository.save(existingTopic);
    }

    @Transactional
    public void deleteTopic(Long actorId, Long id) {
        User actor = forumPermissionService.requireAuthenticatedUser(actorId);
        Topic existingTopic = topicRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Thema nicht gefunden."));
        forumPermissionService.assertCanManageTopic(actor, existingTopic);

        postRepository.deleteByTopic_Id(id);
        topicRepository.deleteById(id);
    }
}
