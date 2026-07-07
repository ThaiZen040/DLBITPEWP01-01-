package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Role;
import de.thaizen.webforum.model.User;
import de.thaizen.webforum.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(User user) {
        if (user.getRole() == null) {
            user.setRole(Role.USER);
        }
        return userRepository.save(user);
    }

    public Optional<User> login(String username, String password) {
        return userRepository.findByUsernameAndPasswordHash(username, password);
    }
}
