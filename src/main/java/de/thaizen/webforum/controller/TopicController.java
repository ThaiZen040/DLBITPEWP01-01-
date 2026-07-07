package de.thaizen.webforum.controller;

import de.thaizen.webforum.model.Topic;
import de.thaizen.webforum.service.TopicService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/topics")
public class TopicController {

    private final TopicService topicService;

    public TopicController(TopicService topicService) {
        this.topicService = topicService;
    }

    @GetMapping
    public Iterable<Topic> getAllTopics() {
        return topicService.getAllTopics();
    }

    @PostMapping
    public Topic createTopic(@RequestHeader(value = "X-User-Id", required = false) Long actorId,
                             @RequestBody Topic topic) {
        return topicService.createTopic(actorId, topic);
    }

    @PutMapping("/{id}")
    public Topic updateTopic(@RequestHeader(value = "X-User-Id", required = false) Long actorId,
                             @PathVariable Long id,
                             @RequestBody Topic topic) {
        return topicService.updateTopic(actorId, id, topic);
    }

    @DeleteMapping("/{id}")
    public void deleteTopic(@RequestHeader(value = "X-User-Id", required = false) Long actorId,
                            @PathVariable Long id) {
        topicService.deleteTopic(actorId, id);
    }
}
