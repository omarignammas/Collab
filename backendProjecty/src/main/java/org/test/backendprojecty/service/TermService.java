package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.config.PaginationUtils;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.request.TermRequest;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.TermResponse;
import org.test.backendprojecty.entity.Term;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.TermMapper;
import org.test.backendprojecty.repository.TermRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TermService {

    private final TermRepository termRepository;
    private final TermMapper termMapper;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public TermResponse createTerm(TermRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        if (termRepository.existsByNameAndUserId(request.getName(), currentUser.getId())) {
            throw new BadRequestException("Term name already exists");
        }

        Term term = Term.builder()
                .name(request.getName())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isCurrent(request.isCurrent())
                .user(currentUser)
                .build();

        term = termRepository.save(term);
        return termMapper.toResponse(term);
    }

    @Transactional(readOnly = true)
    public PagingResult<TermResponse> getAllTerms(PaginationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        Pageable pageable = PaginationUtils.getPageable(request);
        Page<Term> termsPage = termRepository.findByUserId(currentUser.getId(), pageable);

        List<TermResponse> content = termsPage.getContent()
                .stream()
                .map(termMapper::toResponse)
                .collect(Collectors.toList());

        return new PagingResult<>(
                content,
                termsPage.getTotalPages(),
                termsPage.getTotalElements(),
                termsPage.getSize(),
                termsPage.getNumber(),
                termsPage.isEmpty()
        );
    }

    @Transactional(readOnly = true)
    public TermResponse getTermById(Long termId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Term term = termRepository.findByIdAndUserId(termId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Term not found with id: " + termId));
        return termMapper.toResponse(term);
    }

    @Transactional
    public TermResponse updateTerm(Long termId, TermRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Term term = termRepository.findByIdAndUserId(termId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Term not found with id: " + termId));

        term.setName(request.getName());
        term.setStartDate(request.getStartDate());
        term.setEndDate(request.getEndDate());
        term.setCurrent(request.isCurrent());

        term = termRepository.save(term);
        return termMapper.toResponse(term);
    }

    @Transactional
    public void deleteTerm(Long termId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Term term = termRepository.findByIdAndUserId(termId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Term not found with id: " + termId));

        termRepository.delete(term);
    }
}
