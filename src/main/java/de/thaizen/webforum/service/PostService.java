package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Post;
import de.thaizen.webforum.repository.PostRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PostService {

    private final PostRepository postRepository;

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

    public List<Post> findAllPosts() {
        return postRepository.findAll();
    }

    public void deletePost(long id) {
        postRepository.deleteById(id);
    }
}
