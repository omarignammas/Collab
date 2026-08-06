package org.test.backendprojecty.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.test.backendprojecty.dtos.response.QuizQuestionResponse;
import org.test.backendprojecty.dtos.response.QuizResponse;
import org.test.backendprojecty.entity.Quiz;
import org.test.backendprojecty.entity.QuizQuestion;

import java.util.List;

@Component
public class QuizMapper {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public QuizResponse toResponse(Quiz quiz, List<QuizQuestion> questions, Long viewerId) {
        return QuizResponse.builder()
                .id(quiz.getId())
                .summaryId(quiz.getSummary().getId())
                .summaryTitle(quiz.getSummary().getTitle())
                .title(quiz.getTitle())
                .difficulty(quiz.getDifficulty())
                .status(quiz.getStatus())
                .isOwner(quiz.getUser().getId().equals(viewerId))
                .ownerName(quiz.getUser().getFirstName() + " " + quiz.getUser().getLastName())
                .questions(questions == null ? null : questions.stream().map(this::toQuestionResponse).toList())
                .focusPrompt(quiz.getFocusPrompt())
                .referenceFileNames(parseReferenceFileNames(quiz.getReferenceFilesJson()))
                .createdAt(quiz.getCreatedAt())
                .build();
    }

    private List<String> parseReferenceFileNames(String referenceFilesJson) {
        if (referenceFilesJson == null || referenceFilesJson.isBlank()) return null;
        try {
            List<String> names = new java.util.ArrayList<>();
            objectMapper.readTree(referenceFilesJson).forEach(node -> names.add(node.path("name").asText(null)));
            return names;
        } catch (Exception e) {
            return null;
        }
    }

    public QuizQuestionResponse toQuestionResponse(QuizQuestion question) {
        return QuizQuestionResponse.builder()
                .id(question.getId())
                .questionText(question.getQuestionText())
                .options(parseOptions(question.getOptionsJson()))
                .position(question.getPosition())
                .build();
    }

    public List<String> parseOptions(String optionsJson) {
        try {
            return objectMapper.readValue(optionsJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Corrupt options JSON on quiz question: " + optionsJson, e);
        }
    }
}
