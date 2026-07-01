package de.thaizen.webforum.controller;

import de.thaizen.webforum.model.User;
import de.thaizen.webforum.service.UserService;
import org.springframework.web.bind.annotation.*;

@RestController
public class UserController {

    // Zugriff auf die Geschäftslogik von User
    private final UserService userService;

    // Dependency Injection
    public UserController(UserService userService) {
        this.userService = userService;
    }
}

@PostMapping("/register")
public User registerUser(@RequestBody User user) {
    return userService.createUser(user);
}

@PutMapping("/users/{id}")
public User updateUser(Long id, User user) {
}


@DeleteMapping(value = "/users/{id}")
public void deleteUser(Long id) {
}
