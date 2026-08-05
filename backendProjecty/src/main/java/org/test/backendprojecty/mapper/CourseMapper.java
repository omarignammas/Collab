package org.test.backendprojecty.mapper;

import org.springframework.stereotype.Component;
import org.test.backendprojecty.dtos.response.CourseResponse;
import org.test.backendprojecty.entity.Course;

@Component
public class CourseMapper {

    public CourseResponse toResponse(Course course, Long viewerId) {
        return CourseResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .termId(course.getTerm().getId())
                .colorTag(course.getColorTag())
                .instructorName(course.getInstructorName())
                .instructorEmail(course.getInstructorEmail())
                .youtubePlaylistId(course.getYoutubePlaylistId())
                .thumbnailUrl(course.getThumbnailUrl())
                .isOwner(course.getUser().getId().equals(viewerId))
                .ownerName(course.getUser().getFirstName() + " " + course.getUser().getLastName())
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }
}
