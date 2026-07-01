package de.thaizen.webforum.controller;

import de.thaizen.webforum.model.Post;
import de.thaizen.webforum.service.PostService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/posts")
public class PostController {

    private final PostService postService;

    // Dependency Injection
    public PostController(PostService postService) {
        this.postService = postService;
    }

    // POST: Beitrag erstellen
    @PostMapping
    public Post createPost(@RequestBody Post post) {
        return postService.createPost(post);
    }

    // GET: Alle Beiträge anzeigen
    @GetMapping
    public List<Post> getAllPosts() {
        return postService.findAllPosts();
    }

    // GET: Einzelnen Beitrag nach ID anzeigen
    @GetMapping("/{id}")
    public Post getPostById(@PathVariable Long id) {
        return postService.findPostById(id);
    }

    // PUT: Beitrag bearbeiten
    @PutMapping("/{id}")
    public Post updatePost(@PathVariable Long id, @RequestBody Post post) {
        post.setId(id);
        return postService.updatePost(post);
    }

    // DELETE: Beitrag löschen
    @DeleteMapping("/{id}")
    public void deletePost(@PathVariable Long id) {
        postService.deletePost(id);
    }
}