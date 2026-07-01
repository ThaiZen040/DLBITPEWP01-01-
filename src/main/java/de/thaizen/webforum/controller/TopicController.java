package de.thaizen.webforum.controller;

import de.thaizen.webforum.model.Topic;
import de.thaizen.webforum.service.TopicService;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/topics")
public class TopicController {

    // Zugriff auf den Service
    private final TopicService topicService;

    // Dependency Injection
    public TopicController(TopicService topicService) {
        this.topicService = topicService;
    }

    // Ruft den Service auf, um alle Themen abzurufen
    @GetMapping
    public Iterable<Topic> getAllTopics() {
        return topicService.getAllTopics();
    }
    // Ruft den Service auf, um ein neues Thema zu erstellen
    @PostMapping
    public Topic createTopic(@RequestBody Topic topic) { // Spring benötigt @RequestBody, um den Inhalt der Anfrage zu lesen
        return topicService.createTopic(topic);
    }

    // Ruft den Service auf, um ein Thema zu aktualisieren
    @PutMapping("/{id}")
    public Topic updateTopic(@PathVariable Long id, @RequestBody Topic topic) {
        return topicService.updateTopic(topic);
    }
    // Löscht ein Thema anhand der ID
    @DeleteMapping("/{id}")
    public void deleteTopic(@PathVariable Long id) {
        topicService.deleteTopic(id);
    }
}