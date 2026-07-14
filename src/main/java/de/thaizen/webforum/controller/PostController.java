package de.thaizen.webforum.controller;

import de.thaizen.webforum.model.Post;
import de.thaizen.webforum.model.User;
import de.thaizen.webforum.service.SessionAuthService;
import de.thaizen.webforum.service.PostService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/posts")
public class PostController {

    private final PostService postService;
    private final SessionAuthService sessionAuthService;

    public PostController(PostService postService, SessionAuthService sessionAuthService) {
        this.postService = postService;
        this.sessionAuthService = sessionAuthService;
    }

    @PostMapping
    public Post createPost(HttpServletRequest request,
                           @RequestBody Post post) {
        User actor = sessionAuthService.requireAuthenticatedUser(request);
        return postService.createPost(actor, post);
    }

    @GetMapping
    public List<Post> getAllPosts() {
        return postService.findAllPosts();
    }

    @PutMapping("/{id}")
    public Post updatePost(HttpServletRequest request,
                           @PathVariable Long id,
                           @RequestBody Post post) {
        User actor = sessionAuthService.requireAuthenticatedUser(request);
        return postService.updatePost(actor, id, post);
    }

    @DeleteMapping("/{id}")
    public void deletePost(HttpServletRequest request,
                           @PathVariable Long id) {
        User actor = sessionAuthService.requireAuthenticatedUser(request);
        postService.deletePost(actor, id);
    }
}
