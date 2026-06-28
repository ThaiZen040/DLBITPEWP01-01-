package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Post;
import de.thaizen.webforum.repository.PostRepository;
import org.springframework.stereotype.Service;

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

}
