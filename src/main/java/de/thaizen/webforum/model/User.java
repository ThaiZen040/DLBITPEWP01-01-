package de.thaizen.webforum.model;

public class User {
    private String username;
    private String password;
    private String email;
    private String role;
    private String token;

    public User() {

        this.username = username;
        this.password = password;
        this.email = email;
        this.role = role;
        this.token = token;
    }


    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }
    public String getEmail() {
        return email;
    }
    public String getRole() {
        return role;
    }
    public String getToken() {
        return token;
    }
    public void setToken(String token) {
        this.token = token;
    }
    public void setUsername(String username) {
        this.username = username;
    }
    public void setPassword(String password) {
        this.password = password;
    }
    public void setEmail(String email) {
        this.email = email;
    }
    public void setRole(String role) {
        this.role = role;
    }

}

