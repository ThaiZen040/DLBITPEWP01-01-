package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Post;
import de.thaizen.webforum.repository.PostRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PostService {

    // Zugriff Datenbank
    private final PostRepository postRepository;

    //DP Injection
    public PostService(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    public Post createPost(Post post) {
        return postRepository.save(post);
    }

    public Post updatePost(Post post) {
        return postRepository.save(post);
    }

    public Post findPostById(long id) {
        return postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post nicht gefunden mit ID: " + id));
    }

    public void deletePost(Long id) {
        postRepository.deleteById(id);
    }

    public List<Post> findAllPosts() {
        return postRepository.findAll();
    }

    public void deletePost(long id) {
        postRepository.deleteById(id);
    }
}
