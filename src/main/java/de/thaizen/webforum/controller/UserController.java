package de.thaizen.webforum.controller;

import de.thaizen.webforum.model.User;
import de.thaizen.webforum.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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

    // REST API - Login
    @PostMapping("/login")
    public User loginUser(@RequestBody LoginRequest loginRequest) {
        return userService.login(loginRequest.username(), loginRequest.password())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login fehlgeschlagen."));
    }

}

record LoginRequest(String username, String password) {
}
