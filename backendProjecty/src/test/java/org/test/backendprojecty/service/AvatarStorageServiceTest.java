package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.test.backendprojecty.exception.BadRequestException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class AvatarStorageServiceTest {

    @TempDir
    Path tempDir;

    private AvatarStorageService avatarStorageService;

    @BeforeEach
    void setUp() {
        avatarStorageService = new AvatarStorageService(tempDir.toString());
    }

    @Test
    void store_ValidPng_ReturnsUrlAndWritesFile() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[]{1, 2, 3});

        String url = avatarStorageService.store(8L, file);

        assertTrue(url.startsWith("/uploads/avatars/8-"));
        assertTrue(url.endsWith(".png"));
        String filename = url.substring("/uploads/avatars/".length());
        assertTrue(Files.exists(tempDir.resolve("avatars").resolve(filename)));
    }

    @Test
    void store_DisallowedContentType_ThrowsBadRequest() {
        MockMultipartFile file = new MockMultipartFile("file", "doc.pdf", "application/pdf", new byte[]{1});

        assertThrows(BadRequestException.class, () -> avatarStorageService.store(8L, file));
    }

    @Test
    void store_TooLarge_ThrowsBadRequest() {
        byte[] tooBig = new byte[2 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", tooBig);

        assertThrows(BadRequestException.class, () -> avatarStorageService.store(8L, file));
    }

    @Test
    void store_EmptyFile_ThrowsBadRequest() {
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[0]);

        assertThrows(BadRequestException.class, () -> avatarStorageService.store(8L, file));
    }
}
