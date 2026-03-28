package com.supplychain.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String username;

    private String password;

    @Column(unique = true)
    private String email;


    // Used for forgot-password reset flow
    private String resetToken;
}

