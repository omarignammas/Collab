package org.test.backendprojecty.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.UnauthorizedException;
import org.test.backendprojecty.repository.UserRepository;

@Component
@RequiredArgsConstructor
public class CurrentUserProvider {

    private final UserRepository userRepository;

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        SecurityUser securityUser = (SecurityUser) authentication.getPrincipal();
        return userRepository.findById(securityUser.getUser().getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }
}
