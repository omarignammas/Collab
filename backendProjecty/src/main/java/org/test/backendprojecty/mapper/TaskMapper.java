package org.test.backendprojecty.mapper;

import org.springframework.stereotype.Component;
import org.test.backendprojecty.dtos.response.TaskResponse;
import org.test.backendprojecty.entity.Task;
import org.test.backendprojecty.entity.TaskStatus;

@Component
public class TaskMapper {

    public TaskResponse toResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .dueDate(task.getDueDate())
                .completed(task.isCompleted())
                .completedAt(task.getCompletedAt())
                .status(task.isCompleted()
                        ? TaskStatus.DONE
                        : task.getStatus() != null ? task.getStatus() : TaskStatus.TODO)
                .courseId(task.getCourse() != null ? task.getCourse().getId() : null)
                .courseTitle(task.getCourse() != null ? task.getCourse().getTitle() : null)
                .type(task.getType())
                .priority(task.getPriority())
                .youtubeVideoId(task.getYoutubeVideoId())
                .position(task.getPosition())
                .durationMinutes(task.getDurationMinutes())
                .assigneeId(task.getUser().getId())
                .assigneeName(task.getUser().getFirstName() + " " + task.getUser().getLastName())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
