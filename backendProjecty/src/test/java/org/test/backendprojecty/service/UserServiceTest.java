package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.test.backendprojecty.dtos.request.UserUpdateRequest;
import org.test.backendprojecty.dtos.response.UserResponse;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private CurrentUserProvider currentUserProvider;
    @Mock
    private AvatarStorageService avatarStorageService;

    private UserService userService;
    private User user;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, currentUserProvider, avatarStorageService);

        user = User.builder()
                .id(1L)
                .email("jordan@example.com")
                .firstName("Jordan")
                .lastName("Rivera")
                .build();

        lenient().when(currentUserProvider.getCurrentUser()).thenReturn(user);
    }

    @Test
    void updateProfile_Success() {
        UserUpdateRequest request = UserUpdateRequest.builder()
                .firstName("Jamie").lastName("Rivera").email("jamie@example.com")
                .build();
        when(userRepository.existsByEmail("jamie@example.com")).thenReturn(false);

        UserResponse response = userService.updateProfile(request);

        assertEquals("Jamie", response.getFirstName());
        assertEquals("jamie@example.com", response.getEmail());
        verify(userRepository).save(user);
    }

    @Test
    void updateProfile_SameEmailUnchanged_DoesNotCheckUniqueness() {
        UserUpdateRequest request = UserUpdateRequest.builder()
                .firstName("Jordan").lastName("Rivera").email("jordan@example.com")
                .build();

        userService.updateProfile(request);

        verify(userRepository, never()).existsByEmail(anyString());
        verify(userRepository).save(user);
    }

    @Test
    void updateProfile_DuplicateEmail_ThrowsBadRequest() {
        UserUpdateRequest request = UserUpdateRequest.builder()
                .firstName("Jordan").lastName("Rivera").email("taken@example.com")
                .build();
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> userService.updateProfile(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateAvatar_Success_StoresAndPersistsUrl() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[]{1});
        when(avatarStorageService.store(1L, file)).thenReturn("/uploads/avatars/1-abc.png");

        UserResponse response = userService.updateAvatar(file);

        assertEquals("/uploads/avatars/1-abc.png", response.getAvatarUrl());
        assertEquals("/uploads/avatars/1-abc.png", user.getAvatarUrl());
        verify(userRepository).save(user);
    }
}
