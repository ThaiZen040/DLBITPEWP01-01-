package de.thaizen.webforum.controller;

import de.thaizen.webforum.model.User;
import de.thaizen.webforum.service.UserService;
import org.springframework.web.bind.annotation.*;

@RestController
public class UserController {

    // Zugriff auf den Service
    private final UserService userService;
    // Dependency Injection
    public UserController(UserService userService) {
        this.userService = userService;
    }
    // REST API - Registrierung
    @PostMapping("/register")
    public User registerUser(@RequestBody User user) {
        return userService.createUser(user);
    }
    // Rest API - Login
    @PutMapping("/users/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        return userService.updateUser(user);
    }
    // Delete User
    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }
}