package de.thaizen.webforum.repository;

import de.thaizen.webforum.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsernameAndPasswordHash(String username, String passwordHash);
}
