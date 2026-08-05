package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.test.backendprojecty.dtos.request.UserUpdateRequest;
import org.test.backendprojecty.dtos.response.UserResponse;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AvatarStorageService avatarStorageService;

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser() {
        return toResponse(currentUserProvider.getCurrentUser());
    }

    @Transactional
    public UserResponse updateProfile(UserUpdateRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (!currentUser.getEmail().equalsIgnoreCase(request.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        currentUser.setFirstName(request.getFirstName());
        currentUser.setLastName(request.getLastName());
        currentUser.setEmail(request.getEmail());
        userRepository.save(currentUser);

        return toResponse(currentUser);
    }

    @Transactional
    public UserResponse updateAvatar(MultipartFile file) {
        User currentUser = currentUserProvider.getCurrentUser();

        String avatarUrl = avatarStorageService.store(currentUser.getId(), file);
        currentUser.setAvatarUrl(avatarUrl);
        userRepository.save(currentUser);

        return toResponse(currentUser);
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
