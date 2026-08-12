package org.test.backendprojecty.mapper;

import org.junit.jupiter.api.Test;
import org.test.backendprojecty.dtos.response.TaskResponse;
import org.test.backendprojecty.entity.Task;
import org.test.backendprojecty.entity.TaskStatus;
import org.test.backendprojecty.entity.User;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TaskMapperTest {

    private final TaskMapper mapper = new TaskMapper();

    @Test
    void legacyOpenTaskWithoutStatusDefaultsToTodo() {
        Task task = Task.builder()
                .id(1L)
                .title("Legacy task")
                .user(User.builder().id(1L).firstName("Test").lastName("User").build())
                .build();
        task.setStatus(null);

        TaskResponse response = mapper.toResponse(task);

        assertEquals(TaskStatus.TODO, response.getStatus());
    }

    @Test
    void completedFlagWinsForLegacyCompletedTask() {
        Task task = Task.builder()
                .id(2L)
                .title("Completed legacy task")
                .completed(true)
                .status(TaskStatus.TODO)
                .user(User.builder().id(1L).firstName("Test").lastName("User").build())
                .build();

        TaskResponse response = mapper.toResponse(task);

        assertEquals(TaskStatus.DONE, response.getStatus());
    }
}
