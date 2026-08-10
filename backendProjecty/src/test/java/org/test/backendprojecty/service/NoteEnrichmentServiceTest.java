package org.test.backendprojecty.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.test.backendprojecty.entity.GenerationStatus;
import org.test.backendprojecty.entity.Note;
import org.test.backendprojecty.event.NoteCreatedEvent;
import org.test.backendprojecty.repository.NoteRepository;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NoteEnrichmentServiceTest {

    @Mock private NoteRepository noteRepository;
    @Mock private LlmApiClient llmApiClient;

    private NoteEnrichmentService service;

    @BeforeEach
    void setUp() {
        service = new NoteEnrichmentService(noteRepository, llmApiClient, new ObjectMapper());
    }

    @Test
    void enrich_WithoutConfiguredAi_ExtractsUsefulMetadataLocally() {
        Note note = Note.builder()
                .id(12L)
                .title("Competitor review")
                .body("Research competitors tomorrow at 10am using https://example.com/docs.")
                .rawBody("Research competitors tomorrow at 10am using https://example.com/docs.")
                .build();
        when(noteRepository.findById(12L)).thenReturn(Optional.of(note));
        when(llmApiClient.isConfigured()).thenReturn(false);

        service.enrich(new NoteCreatedEvent(12L));

        ArgumentCaptor<Note> captor = ArgumentCaptor.forClass(Note.class);
        verify(noteRepository).save(captor.capture());
        Note enriched = captor.getValue();
        assertEquals("Research", enriched.getTheme());
        assertTrue(enriched.getExtractedLinks().contains("https://example.com/docs"));
        assertTrue(enriched.getTimeReferences().contains("tomorrow"));
        assertTrue(enriched.getTimeReferences().contains("10am"));
        assertEquals(GenerationStatus.READY, enriched.getEnrichmentStatus());
        assertFalse(enriched.getAiEnriched());
    }

    @Test
    void enrich_WithConfiguredAi_UsesStructuredResponseAndPreservesRawBody() {
        Note note = Note.builder().id(9L).title("Team sync").body("raw note").rawBody("raw note").build();
        when(noteRepository.findById(9L)).thenReturn(Optional.of(note));
        when(llmApiClient.isConfigured()).thenReturn(true);
        when(llmApiClient.generateText(anyString(), eq(1000))).thenReturn("""
                {"formattedMarkdown":"## Decision\\n- Ship Friday","theme":"Meetings","tags":["launch","team"],"links":[],"timeReferences":["Friday"]}
                """);

        service.enrich(new NoteCreatedEvent(9L));

        verify(noteRepository).save(any(Note.class));
        assertEquals("## Decision\n- Ship Friday", note.getBody());
        assertEquals("raw note", note.getRawBody());
        assertEquals("Meetings", note.getTheme());
        assertEquals(2, note.getTags().size());
        assertTrue(note.getAiEnriched());
    }
}
