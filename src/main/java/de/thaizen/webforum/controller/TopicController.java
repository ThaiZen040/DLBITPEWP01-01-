package de.thaizen.webforum.controller;

import de.thaizen.webforum.model.Topic;
import de.thaizen.webforum.model.User;
import de.thaizen.webforum.service.SessionAuthService;
import de.thaizen.webforum.service.TopicService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/topics")
public class TopicController {

    private final TopicService topicService;
    private final SessionAuthService sessionAuthService;

    public TopicController(TopicService topicService, SessionAuthService sessionAuthService) {
        this.topicService = topicService;
        this.sessionAuthService = sessionAuthService;
    }

    @GetMapping
    public Iterable<Topic> getAllTopics() {
        return topicService.getAllTopics();
    }

    @PostMapping
    public Topic createTopic(HttpServletRequest request,
                             @RequestBody Topic topic) {
        User actor = sessionAuthService.requireAuthenticatedUser(request);
        return topicService.createTopic(actor, topic);
    }

    @PutMapping("/{id}")
    public Topic updateTopic(HttpServletRequest request,
                             @PathVariable Long id,
                             @RequestBody Topic topic) {
        User actor = sessionAuthService.requireAuthenticatedUser(request);
        return topicService.updateTopic(actor, id, topic);
    }

    @DeleteMapping("/{id}")
    public void deleteTopic(HttpServletRequest request,
                            @PathVariable Long id) {
        User actor = sessionAuthService.requireAuthenticatedUser(request);
        topicService.deleteTopic(actor, id);
    }
}
