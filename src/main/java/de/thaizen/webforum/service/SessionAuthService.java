package de.thaizen.webforum.service;

import de.thaizen.webforum.model.User;
import de.thaizen.webforum.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
public class SessionAuthService {
    private static final String AUTHENTICATED_USER_ID = "authenticatedUserId";

    private final UserRepository userRepository;

    public SessionAuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public void authenticate(HttpServletRequest request, User user) {
        if (user.getId() == null) {
            throw new IllegalArgumentException("Ein nicht gespeicherter Benutzer kann nicht angemeldet werden.");
        }

        request.getSession(true).setAttribute(AUTHENTICATED_USER_ID, user.getId());
    }

    public Optional<User> getAuthenticatedUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return Optional.empty();
        }

        Object userId = session.getAttribute(AUTHENTICATED_USER_ID);
        if (!(userId instanceof Long id)) {
            return Optional.empty();
        }

        Optional<User> user = userRepository.findById(id);
        if (user.isEmpty()) {
            session.removeAttribute(AUTHENTICATED_USER_ID);
        }
        return user;
    }

    public User requireAuthenticatedUser(HttpServletRequest request) {
        return getAuthenticatedUser(request)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Bitte zuerst einloggen."));
    }

    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }
}
