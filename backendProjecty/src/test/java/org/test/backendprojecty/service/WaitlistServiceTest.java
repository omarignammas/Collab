package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.test.backendprojecty.entity.WaitlistEntry;
import org.test.backendprojecty.repository.WaitlistEntryRepository;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WaitlistServiceTest {

    @Mock
    private WaitlistEntryRepository waitlistEntryRepository;
    @Mock
    private JavaMailSender mailSender;

    private WaitlistService service;

    @BeforeEach
    void setUp() throws Exception {
        service = new WaitlistService(waitlistEntryRepository, mailSender);
        setField("notifyEmail", "omar.ignammas2003@gmail.com");
        setField("fromAddress", "waitlist@collab.app");
    }

    private void setField(String name, String value) throws Exception {
        Field field = WaitlistService.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(service, value);
    }

    @Test
    void join_NewEmail_SavesAndSendsNotification() {
        when(waitlistEntryRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);

        service.join("New@Example.com");

        ArgumentCaptor<WaitlistEntry> entryCaptor = ArgumentCaptor.forClass(WaitlistEntry.class);
        verify(waitlistEntryRepository).save(entryCaptor.capture());
        assertEquals("new@example.com", entryCaptor.getValue().getEmail());
        assertNotNull(entryCaptor.getValue().getCreatedAt());

        ArgumentCaptor<SimpleMailMessage> mailCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(mailCaptor.capture());
        assertEquals("omar.ignammas2003@gmail.com", mailCaptor.getValue().getTo()[0]);
        assertTrue(mailCaptor.getValue().getText().contains("new@example.com"));
    }

    @Test
    void join_AlreadyOnList_SkipsSaveAndEmail() {
        when(waitlistEntryRepository.existsByEmailIgnoreCase("existing@example.com")).thenReturn(true);

        service.join("existing@example.com");

        verify(waitlistEntryRepository, never()).save(any());
        verifyNoInteractions(mailSender);
    }

    @Test
    void join_MailNotConfigured_StillSavesWithoutSending() throws Exception {
        setField("fromAddress", "");
        when(waitlistEntryRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);

        service.join("new@example.com");

        verify(waitlistEntryRepository).save(any(WaitlistEntry.class));
        verifyNoInteractions(mailSender);
    }

    @Test
    void join_MailSendThrows_SaveStillSucceeds() {
        when(waitlistEntryRepository.existsByEmailIgnoreCase("new@example.com")).thenReturn(false);
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));

        assertDoesNotThrow(() -> service.join("new@example.com"));

        verify(waitlistEntryRepository).save(any(WaitlistEntry.class));
    }
}
