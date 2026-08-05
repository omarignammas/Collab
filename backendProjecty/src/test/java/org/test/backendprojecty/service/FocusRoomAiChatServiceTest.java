package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.test.backendprojecty.entity.FocusMessageType;
import org.test.backendprojecty.entity.FocusRoom;
import org.test.backendprojecty.entity.FocusRoomMessage;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.event.AiChatRequestedEvent;
import org.test.backendprojecty.repository.FocusRoomMessageRepository;
import org.test.backendprojecty.repository.FocusRoomRepository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FocusRoomAiChatServiceTest {

    @Mock
    private FocusRoomRepository focusRoomRepository;
    @Mock
    private FocusRoomMessageRepository messageRepository;
    @Mock
    private LlmApiClient llmApiClient;
    @Mock
    private FocusRoomService focusRoomService;

    private FocusRoomAiChatService service;

    private User host;
    private FocusRoom room;

    @BeforeEach
    void setUp() {
        service = new FocusRoomAiChatService(focusRoomRepository, messageRepository, llmApiClient, focusRoomService);
        host = User.builder().id(1L).firstName("Host").lastName("User").email("host@example.com").build();
        room = FocusRoom.builder().id(10L).code("ABC-123").name("Study Sesh").host(host).build();

        lenient().when(messageRepository.findTop50ByRoomIdOrderByCreatedAtDesc(10L)).thenReturn(Collections.emptyList());
    }

    @Test
    void onAiChatRequested_Success_SavesAiMessageAndRebroadcasts() {
        when(focusRoomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(llmApiClient.generateText(anyString())).thenReturn("Osmosis is the movement of water...");

        service.onAiChatRequested(new AiChatRequestedEvent(10L, "what is osmosis?"));

        ArgumentCaptor<FocusRoomMessage> captor = ArgumentCaptor.forClass(FocusRoomMessage.class);
        verify(messageRepository).save(captor.capture());
        assertEquals(FocusMessageType.AI, captor.getValue().getType());
        assertNull(captor.getValue().getSender());
        assertEquals("Osmosis is the movement of water...", captor.getValue().getBody());

        verify(focusRoomService).broadcastSnapshot("ABC-123");
    }

    @Test
    void onAiChatRequested_PromptIncludesRecentConversationAndQuestion() {
        when(focusRoomRepository.findById(10L)).thenReturn(Optional.of(room));
        FocusRoomMessage priorChat = FocusRoomMessage.builder()
                .room(room).sender(host).type(FocusMessageType.CHAT).body("starting chapter 4").build();
        FocusRoomMessage systemNoise = FocusRoomMessage.builder()
                .room(room).sender(null).type(FocusMessageType.SYSTEM).body("Host joined").build();
        when(messageRepository.findTop50ByRoomIdOrderByCreatedAtDesc(10L))
                .thenReturn(new ArrayList<>(List.of(systemNoise, priorChat)));
        when(llmApiClient.generateText(anyString())).thenReturn("answer");

        service.onAiChatRequested(new AiChatRequestedEvent(10L, "what is osmosis?"));

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(llmApiClient).generateText(promptCaptor.capture());
        String prompt = promptCaptor.getValue();
        assertTrue(prompt.contains("Host User: starting chapter 4"));
        assertTrue(prompt.contains("what is osmosis?"));
        assertFalse(prompt.contains("Host joined"));
    }

    @Test
    void onAiChatRequested_LlmFails_SavesApologeticFallbackMessage() {
        when(focusRoomRepository.findById(10L)).thenReturn(Optional.of(room));
        when(llmApiClient.generateText(anyString())).thenThrow(new RuntimeException("AI down"));

        service.onAiChatRequested(new AiChatRequestedEvent(10L, "what is osmosis?"));

        ArgumentCaptor<FocusRoomMessage> captor = ArgumentCaptor.forClass(FocusRoomMessage.class);
        verify(messageRepository).save(captor.capture());
        assertEquals(FocusMessageType.AI, captor.getValue().getType());
        assertTrue(captor.getValue().getBody().toLowerCase().contains("sorry"));
        verify(focusRoomService).broadcastSnapshot("ABC-123");
    }

    @Test
    void onAiChatRequested_RoomNotFound_NoOp() {
        when(focusRoomRepository.findById(999L)).thenReturn(Optional.empty());

        service.onAiChatRequested(new AiChatRequestedEvent(999L, "what is osmosis?"));

        verifyNoInteractions(llmApiClient, messageRepository, focusRoomService);
    }
}
