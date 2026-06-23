package de.thaizen.webforum.repository;

import de.thaizen.webforum.model.User;
import org.springframework.data.jpa.repository.JpaRepository;


public interface UserRepository extends JpaRepository<User, Long> {

}