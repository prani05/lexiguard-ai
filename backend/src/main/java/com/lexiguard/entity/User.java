package com.lexiguard.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "preferred_governing_law")
    private String preferredGoverningLaw;

    @Column(name = "max_non_compete_months")
    private Integer maxNonCompeteMonths;

    @Column(name = "require_mutual_indemnity")
    private Boolean requireMutualIndemnity = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.requireMutualIndemnity == null) {
            this.requireMutualIndemnity = false;
        }
    }
}
