package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Post;
import de.thaizen.webforum.repository.PostRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PostService {
    // Zugriff auf die Datenbank
    private final PostRepository postRepository;

    //Konstruktor
    public  PostService(PostRepository postRepository) {
        this.postRepository = postRepository;
    }
    public Post createPost(Post post)
    {
        return postRepository.save(post);
    }

    public Post  updatePost(Post post)
    {
        return postRepository.save(post);
    }

    public Post findPostById(long id)
    { if  (postRepository.findById(id).isPresent())
        return postRepository.findById(id).get();
    }

    public List<Post> findAllPosts() {
        return postRepository.findAll();
    }

}
