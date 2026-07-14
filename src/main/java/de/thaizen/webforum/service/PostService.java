package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Post;
import de.thaizen.webforum.model.Topic;
import de.thaizen.webforum.model.User;
import de.thaizen.webforum.repository.PostRepository;
import de.thaizen.webforum.repository.TopicRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PostService {

    // Zugriff Datenbank
    private final PostRepository postRepository;
    private final TopicRepository topicRepository;
    private final ForumPermissionService forumPermissionService;

    //DP Injection
    public PostService(PostRepository postRepository,
                       TopicRepository topicRepository,
                       ForumPermissionService forumPermissionService) {
        this.postRepository = postRepository;
        this.topicRepository = topicRepository;
        this.forumPermissionService = forumPermissionService;
    }

    public Post createPost(User actor, Post post) {
        LocalDateTime now = LocalDateTime.now();
        if (post.getCreatedAt() == null) {
            post.setCreatedAt(now);
        }
        post.setAuthor(actor);
        post.setTopic(resolveTopic(post.getTopic()));
        post.setUpdatedAt(now);
        return postRepository.save(post);
    }

    public Post updatePost(User actor, Long id, Post post) {
        Post existingPost = findPostById(id);
        forumPermissionService.assertCanManagePost(actor, existingPost);

        existingPost.setContent(post.getContent());

        if (post.getTopic() != null) {
            existingPost.setTopic(resolveTopic(post.getTopic()));
        }

        existingPost.setUpdatedAt(LocalDateTime.now());

        return postRepository.save(existingPost);
    }

    public Post findPostById(long id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post nicht gefunden mit ID: " + id));
    }

    public void deletePost(User actor, Long id) {
        Post existingPost = findPostById(id);
        forumPermissionService.assertCanManagePost(actor, existingPost);

        postRepository.deleteById(id);
    }

    public List<Post> findAllPosts() {
        return postRepository.findAll();
    }

    private Topic resolveTopic(Topic topicReference) {
        Long topicId = topicReference == null ? null : topicReference.getId();
        if (topicId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bitte ein Thema auswählen.");
        }

        return topicRepository.findById(topicId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Das ausgewählte Thema existiert nicht."));
    }
}
