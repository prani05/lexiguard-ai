package com.lexiguard.dto;

import com.lexiguard.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private Role role;
    private String preferredGoverningLaw;
    private Integer maxNonCompeteMonths;
    private Boolean requireMutualIndemnity;
    private LocalDateTime createdAt;
}
