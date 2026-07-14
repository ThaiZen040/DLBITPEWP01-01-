package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Role;
import de.thaizen.webforum.model.User;
import de.thaizen.webforum.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class UserService {
    private static final HexFormat HEX_FORMAT = HexFormat.of();

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(User user) {
        String username = normalizeRequiredField(user.getUsername(), "Benutzername");
        String email = normalizeEmail(user.getEmail());
        String rawPassword = normalizeRequiredField(user.getPasswordHash(), "Passwort");
        Role role = user.getRole() == null ? Role.USER : user.getRole();

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Benutzername ist bereits vergeben.");
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-Mail ist bereits registriert.");
        }

        User newUser = new User(username, hashPassword(rawPassword), email, role);
        return userRepository.save(newUser);
    }

    public Optional<User> login(String username, String password) {
        String normalizedUsername = normalizeRequiredField(username, "Benutzername");
        String rawPassword = normalizeRequiredField(password, "Passwort");

        return userRepository.findByUsernameIgnoreCase(normalizedUsername)
                .filter(user -> passwordMatches(user, rawPassword));
    }

    private String normalizeRequiredField(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " darf nicht leer sein.");
        }

        return value.trim();
    }

    private String normalizeEmail(String email) {
        return normalizeRequiredField(email, "E-Mail").toLowerCase();
    }

    private boolean passwordMatches(User user, String rawPassword) {
        String hashedPassword = hashPassword(rawPassword);
        if (hashedPassword.equals(user.getPasswordHash())) {
            return true;
        }

        // Migriert bereits angelegte lokale Testnutzer mit Klartext-Passwort automatisch.
        if (rawPassword.equals(user.getPasswordHash())) {
            user.setPasswordHash(hashedPassword);
            userRepository.save(user);
            return true;
        }

        return false;
    }

    private String hashPassword(String rawPassword) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashedBytes = digest.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
            return HEX_FORMAT.formatHex(hashedBytes);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 wird auf diesem System nicht unterstützt.", exception);
        }
    }
}
