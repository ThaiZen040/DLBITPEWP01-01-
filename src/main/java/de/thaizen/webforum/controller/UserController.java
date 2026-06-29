package de.thaizen.webforum.controller;

import de.thaizen.webforum.service.UserService;

public class UserController {

    // Zugriff auf die Geschäftslogik von User
    private final UserService userService;

    // Dependency Injection
    public UserController(UserService userService) {
        this.userService = userService;
    }
}
