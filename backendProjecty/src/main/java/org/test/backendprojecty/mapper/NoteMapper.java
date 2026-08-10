package org.test.backendprojecty.mapper;

import org.springframework.stereotype.Component;
import org.test.backendprojecty.dtos.response.NoteResponse;
import org.test.backendprojecty.entity.Note;

@Component
public class NoteMapper {

    public NoteResponse toResponse(Note note) {
        return NoteResponse.builder()
                .id(note.getId())
                .userId(note.getUser().getId())
                .userName(note.getUser().getFirstName() + " " + note.getUser().getLastName())
                .title(note.getTitle())
                .body(note.getBody())
                .rawBody(note.getRawBody())
                .tags(note.getTags())
                .savedUrl(note.getSavedUrl())
                .theme(note.getTheme())
                .extractedLinks(note.getExtractedLinks())
                .timeReferences(note.getTimeReferences())
                .enrichmentStatus(note.getEnrichmentStatus())
                .aiEnriched(Boolean.TRUE.equals(note.getAiEnriched()))
                .courseId(note.getCourse() != null ? note.getCourse().getId() : null)
                .courseTitle(note.getCourse() != null ? note.getCourse().getTitle() : null)
                .taskId(note.getTask() != null ? note.getTask().getId() : null)
                .taskTitle(note.getTask() != null ? note.getTask().getTitle() : null)
                .roomCode(note.getRoom() != null ? note.getRoom().getCode() : null)
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .build();
    }
}
