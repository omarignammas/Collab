package org.test.backendprojecty.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.nio.file.Path;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final String uploadsDir;

    public WebMvcConfig(@Value("${app.uploads.dir:uploads}") String uploadsDir) {
        this.uploadsDir = uploadsDir;
        new File(uploadsDir, "avatars").mkdirs();
        new File(uploadsDir, "course-files").mkdirs();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + Path.of(uploadsDir).toAbsolutePath() + File.separator;
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }
}
