package de.thaizen.webforum.controller;

import de.thaizen.webforum.model.Post;
import de.thaizen.webforum.service.PostService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @PostMapping
    public Post createPost(@RequestHeader(value = "X-User-Id", required = false) Long actorId,
                           @RequestBody Post post) {
        return postService.createPost(actorId, post);
    }

    @GetMapping
    public List<Post> getAllPosts() {
        return postService.findAllPosts();
    }

    @PutMapping("/{id}")
    public Post updatePost(@RequestHeader(value = "X-User-Id", required = false) Long actorId,
                           @PathVariable Long id,
                           @RequestBody Post post) {
        return postService.updatePost(actorId, id, post);
    }

    @DeleteMapping("/{id}")
    public void deletePost(@RequestHeader(value = "X-User-Id", required = false) Long actorId,
                           @PathVariable Long id) {
        postService.deletePost(actorId, id);
    }
}
