package org.test.backendprojecty.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.request.TermRequest;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.TermResponse;
import org.test.backendprojecty.entity.Term;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.TermMapper;
import org.test.backendprojecty.repository.TermRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TermServiceTest {

    @Mock
    private TermRepository termRepository;

    @Mock
    private TermMapper termMapper;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private TermService termService;

    private User user;
    private Term term;
    private TermRequest termRequest;
    private TermResponse termResponse;
    private PaginationRequest paginationRequest;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .email("test@example.com")
                .build();

        term = Term.builder()
                .id(1L)
                .name("Fall 2026")
                .startDate(LocalDate.of(2026, 9, 1))
                .endDate(LocalDate.of(2026, 12, 20))
                .isCurrent(true)
                .user(user)
                .build();

        termRequest = TermRequest.builder()
                .name("Fall 2026")
                .startDate(LocalDate.of(2026, 9, 1))
                .endDate(LocalDate.of(2026, 12, 20))
                .isCurrent(true)
                .build();

        termResponse = TermResponse.builder()
                .id(1L)
                .name("Fall 2026")
                .startDate(LocalDate.of(2026, 9, 1))
                .endDate(LocalDate.of(2026, 12, 20))
                .isCurrent(true)
                .build();

        paginationRequest = PaginationRequest.builder()
                .page(1)
                .size(10)
                .sortField("id")
                .direction(Sort.Direction.ASC)
                .build();

        lenient().when(currentUserProvider.getCurrentUser()).thenReturn(user);
    }

    @Test
    void createTerm_Success() {
        when(termRepository.save(any(Term.class))).thenReturn(term);
        when(termMapper.toResponse(term)).thenReturn(termResponse);

        TermResponse response = termService.createTerm(termRequest);

        assertNotNull(response);
        assertEquals("Fall 2026", response.getName());
        verify(termRepository).save(any(Term.class));
    }

    @Test
    void getAllTerms_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Term> termPage = new PageImpl<>(Arrays.asList(term), pageable, 1);

        when(termRepository.findByUserId(eq(1L), any(Pageable.class)))
                .thenReturn(termPage);
        when(termMapper.toResponse(term)).thenReturn(termResponse);

        PagingResult<TermResponse> result = termService.getAllTerms(paginationRequest);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals("Fall 2026", result.getContent().iterator().next().getName());
        verify(termRepository).findByUserId(eq(1L), any(Pageable.class));
    }

    @Test
    void getTermById_NotFound_ThrowsException() {
        when(termRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> termService.getTermById(1L));
    }

    @Test
    void deleteTerm_Success() {
        when(termRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(term));

        termService.deleteTerm(1L);

        verify(termRepository).delete(term);
    }
}
