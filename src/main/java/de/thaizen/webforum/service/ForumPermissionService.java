package de.thaizen.webforum.service;

import de.thaizen.webforum.model.Post;
import de.thaizen.webforum.model.Role;
import de.thaizen.webforum.model.Topic;
import de.thaizen.webforum.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ForumPermissionService {

    public void assertCanManageTopic(User actor, Topic topic) {
        if (hasRole(actor, Role.ADMIN) || isAuthor(actor, topic.getAuthor())) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Nur der Autor oder ein Admin darf dieses Thema bearbeiten oder löschen.");
    }

    public void assertCanManagePost(User actor, Post post) {
        if (hasRole(actor, Role.ADMIN) || hasRole(actor, Role.MODERATOR) || isAuthor(actor, post.getAuthor())) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Nur der Autor, ein Moderator oder ein Admin darf diesen Beitrag bearbeiten oder löschen.");
    }

    private boolean hasRole(User actor, Role role) {
        return actor != null && actor.getRole() == role;
    }

    private boolean isAuthor(User actor, User author) {
        return actor != null
                && actor.getId() != null
                && author != null
                && actor.getId().equals(author.getId());
    }
}
