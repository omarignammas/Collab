package org.test.backendprojecty.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.test.backendprojecty.exception.BadRequestException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@Service
public class AvatarStorageService {

    private static final long MAX_SIZE_BYTES = 2L * 1024 * 1024;
    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp"
    );

    private final String uploadsDir;

    public AvatarStorageService(@Value("${app.uploads.dir:uploads}") String uploadsDir) {
        this.uploadsDir = uploadsDir;
    }

    public String store(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file provided");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new BadRequestException("Image must be 2MB or smaller");
        }
        String extension = ALLOWED_TYPES.get(file.getContentType());
        if (extension == null) {
            throw new BadRequestException("Image must be PNG, JPEG, or WebP");
        }

        String filename = userId + "-" + UUID.randomUUID() + "." + extension;
        Path target = Path.of(uploadsDir, "avatars", filename);

        try {
            Files.createDirectories(target.getParent());
            Files.copy(file.getInputStream(), target);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store avatar", e);
        }

        return "/uploads/avatars/" + filename;
    }
}
