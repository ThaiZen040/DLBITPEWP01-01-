package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Topic;
import de.thaizen.webforum.repository.TopicRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class TopicService {

    private final TopicRepository topicRepository;

    public TopicService(TopicRepository topicRepository) {
        this.topicRepository = topicRepository;
    }

    // Neues Thema erstellen
    public Topic createTopic(Topic topic) {

        topic.setCreatedAt(LocalDateTime.now());
        topic.setUpdatedAt(LocalDateTime.now());
        topic.setClosed(false);

        return topicRepository.save(topic);
    }

    // Alle Themen abrufen
    public List<Topic> getAllTopics() {
        return topicRepository.findAll();
    }

    // Thema anhand der ID finden
    public Topic getTopicById(Long id) {
        return topicRepository.findById(id)
                .orElse(null);
    }

    // Thema aktualisieren
    public Topic updateTopic(Topic topic) {

        topic.setUpdatedAt(LocalDateTime.now());

        return topicRepository.save(topic);
    }

    // Thema schließen
    public void closeTopic(Long id) {

        Topic topic = topicRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Beitrag nicht gefunden."));

        topic.setClosed(true);
        topic.setUpdatedAt(LocalDateTime.now());

        topicRepository.save(topic);
    }

    // Thema löschen
    public void deleteTopic(Long id) {
        topicRepository.deleteById(id);
    }
}