package com.lexiguard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreferencesRequest {
    private String preferredGoverningLaw;
    private Integer maxNonCompeteMonths;
    private Boolean requireMutualIndemnity;
}
