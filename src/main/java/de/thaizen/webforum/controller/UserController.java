package de.thaizen.webforum.controller;

import de.thaizen.webforum.model.User;
import de.thaizen.webforum.service.SessionAuthService;
import de.thaizen.webforum.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class UserController {

    private final UserService userService;
    private final SessionAuthService sessionAuthService;

    public UserController(UserService userService, SessionAuthService sessionAuthService) {
        this.userService = userService;
        this.sessionAuthService = sessionAuthService;
    }

    @PostMapping("/register")
    public User registerUser(@RequestBody User user, HttpServletRequest request) {
        User createdUser = userService.createUser(user);
        sessionAuthService.authenticate(request, createdUser);
        return createdUser;
    }

    @PostMapping("/login")
    public User loginUser(@RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        User authenticatedUser = userService.login(loginRequest.username(), loginRequest.password())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login fehlgeschlagen."));
        sessionAuthService.authenticate(request, authenticatedUser);
        return authenticatedUser;
    }

    @GetMapping("/session")
    public ResponseEntity<User> getCurrentUser(HttpServletRequest request) {
        return sessionAuthService.getAuthenticatedUser(request)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logoutUser(HttpServletRequest request) {
        sessionAuthService.logout(request);
        return ResponseEntity.noContent().build();
    }

}

record LoginRequest(String username, String password) {
}
