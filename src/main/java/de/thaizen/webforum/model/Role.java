package de.thaizen.webforum.model;

public enum Role {

    USER("Benutzer", "ROLE_USER"),
    MODERATOR("Moderator", "ROLE_MODERATOR"),
    ADMIN("Administrator", "ROLE_ADMIN");

    private final String displayName;
    private final String authority;

    Role(String displayName, String authority) {
        this.displayName = displayName;
        this.authority = authority;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getAuthority() {
        return authority;
    }

}
