package de.thaizen.webforum.repository;

import de.thaizen.webforum.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    void deleteByTopic_Id(Long topicId);
}
