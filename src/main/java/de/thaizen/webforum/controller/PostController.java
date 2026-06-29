package de.thaizen.webforum.controller;

import de.thaizen.webforum.service.PostService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/posts")
public class PostController {

    //Zugriff auf die Geschäftslogik
    private final PostService postService;

    // Dependency Injection
    public PostController(PostService postService) {
        this.postService = postService;
    }

}