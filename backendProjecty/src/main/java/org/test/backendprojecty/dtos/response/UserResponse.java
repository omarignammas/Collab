package org.test.backendprojecty.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.test.backendprojecty.entity.AccountStatus;
import org.test.backendprojecty.entity.Role;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String avatarUrl;
    private Role role;
    private boolean enabled;
    private AccountStatus accountStatus;
    private LocalDateTime approvedAt;
    private LocalDateTime trialExpiresAt;
    private LocalDateTime createdAt;
}
