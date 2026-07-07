package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Post;
import de.thaizen.webforum.model.User;
import de.thaizen.webforum.repository.PostRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PostService {

    // Zugriff Datenbank
    private final PostRepository postRepository;
    private final ForumPermissionService forumPermissionService;

    //DP Injection
    public PostService(PostRepository postRepository, ForumPermissionService forumPermissionService) {
        this.postRepository = postRepository;
        this.forumPermissionService = forumPermissionService;
    }

    public Post createPost(Long actorId, Post post) {
        User actor = forumPermissionService.requireAuthenticatedUser(actorId);
        LocalDateTime now = LocalDateTime.now();
        if (post.getCreatedAt() == null) {
            post.setCreatedAt(now);
        }
        post.setAuthor(actor);
        post.setUpdatedAt(now);
        return postRepository.save(post);
    }

    public Post updatePost(Long actorId, Long id, Post post) {
        User actor = forumPermissionService.requireAuthenticatedUser(actorId);
        Post existingPost = findPostById(id);
        forumPermissionService.assertCanManagePost(actor, existingPost);

        existingPost.setContent(post.getContent());

        if (post.getTopic() != null) {
            existingPost.setTopic(post.getTopic());
        }

        existingPost.setUpdatedAt(LocalDateTime.now());

        return postRepository.save(existingPost);
    }

    public Post findPostById(long id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post nicht gefunden mit ID: " + id));
    }

    public void deletePost(Long actorId, Long id) {
        User actor = forumPermissionService.requireAuthenticatedUser(actorId);
        Post existingPost = findPostById(id);
        forumPermissionService.assertCanManagePost(actor, existingPost);

        postRepository.deleteById(id);
    }

    public List<Post> findAllPosts() {
        return postRepository.findAll();
    }
}
