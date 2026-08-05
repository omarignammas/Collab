package org.test.backendprojecty.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.test.backendprojecty.entity.SourceFileType;
import org.test.backendprojecty.exception.BadRequestException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@Service
public class CourseFileStorageService {

    private static final long MAX_PDF_SIZE_BYTES = 15L * 1024 * 1024;
    private static final long MAX_IMAGE_SIZE_BYTES = 8L * 1024 * 1024;

    private static final Map<String, String> ALLOWED_TYPES = Map.of(
            "application/pdf", "pdf",
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp"
    );

    private final String uploadsDir;

    public CourseFileStorageService(@Value("${app.uploads.dir:uploads}") String uploadsDir) {
        this.uploadsDir = uploadsDir;
    }

    public record StoredFile(String url, SourceFileType fileType) {}

    public StoredFile store(Long userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file provided");
        }

        String extension = ALLOWED_TYPES.get(file.getContentType());
        if (extension == null) {
            throw new BadRequestException("File must be a PDF, PNG, JPEG, or WebP");
        }

        SourceFileType fileType = "pdf".equals(extension) ? SourceFileType.PDF : SourceFileType.IMAGE;
        long maxSize = fileType == SourceFileType.PDF ? MAX_PDF_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
        if (file.getSize() > maxSize) {
            throw new BadRequestException(fileType == SourceFileType.PDF
                    ? "PDF must be 15MB or smaller"
                    : "Image must be 8MB or smaller");
        }

        String filename = userId + "-" + UUID.randomUUID() + "." + extension;
        Path target = Path.of(uploadsDir, "course-files", filename);

        try {
            Files.createDirectories(target.getParent());
            Files.copy(file.getInputStream(), target);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store course file", e);
        }

        return new StoredFile("/uploads/course-files/" + filename, fileType);
    }
}
