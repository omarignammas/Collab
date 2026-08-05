package org.test.backendprojecty.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.test.backendprojecty.config.PaginationUtils;
import org.test.backendprojecty.dtos.request.CourseRequest;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.CourseMemberResponse;
import org.test.backendprojecty.dtos.response.CourseProgressResponse;
import org.test.backendprojecty.dtos.response.CourseResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.dtos.response.TaskResponse;
import org.test.backendprojecty.entity.Course;
import org.test.backendprojecty.entity.CourseMember;
import org.test.backendprojecty.entity.MemberStatus;
import org.test.backendprojecty.entity.NotificationType;
import org.test.backendprojecty.entity.Task;
import org.test.backendprojecty.entity.Term;
import org.test.backendprojecty.entity.User;
import org.test.backendprojecty.exception.BadRequestException;
import org.test.backendprojecty.exception.ResourceNotFoundException;
import org.test.backendprojecty.mapper.CourseMapper;
import org.test.backendprojecty.mapper.TaskMapper;
import org.test.backendprojecty.repository.CourseMemberRepository;
import org.test.backendprojecty.repository.CourseRepository;
import org.test.backendprojecty.repository.TaskRepository;
import org.test.backendprojecty.repository.TermRepository;
import org.test.backendprojecty.repository.UserRepository;
import org.test.backendprojecty.security.CurrentUserProvider;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final TermRepository termRepository;
    private final TaskRepository taskRepository;
    private final CourseMemberRepository courseMemberRepository;
    private final UserRepository userRepository;
    private final CourseMapper courseMapper;
    private final TaskMapper taskMapper;
    private final CurrentUserProvider currentUserProvider;
    private final FriendService friendService;
    private final NotificationService notificationService;

    private Term resolveTerm(Long termId, User currentUser) {
        return termRepository.findByIdAndUserId(termId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Term not found with id: " + termId));
    }

    // Owner-or-member (active or still-invited) — the read-access tier shared by
    // view/team/stats endpoints. An invited-but-not-yet-accepted member still needs
    // to load the course to see and accept the invite. Editing/deleting/inviting
    // stay strictly owner-only elsewhere.
    private Course resolveCourseForViewing(Long courseId, User currentUser) {
        Course course = courseRepository.findById(courseId)
                .filter(c -> !c.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        boolean isOwner = course.getUser().getId().equals(currentUser.getId());
        boolean isMember = !isOwner && courseMemberRepository
                .findByCourseIdAndUserId(courseId, currentUser.getId())
                .isPresent();

        if (!isOwner && !isMember) {
            throw new ResourceNotFoundException("Course not found with id: " + courseId);
        }
        return course;
    }

    @Transactional
    public CourseResponse createCourse(CourseRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Term term = resolveTerm(request.getTermId(), currentUser);

        if (courseRepository.existsByTitleAndUserId(request.getTitle(), currentUser.getId())) {
            throw new BadRequestException("Course title already exists");
        }

        Course course = Course.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .term(term)
                .colorTag(request.getColorTag())
                .instructorName(request.getInstructorName())
                .instructorEmail(request.getInstructorEmail())
                .user(currentUser)
                .build();

        course = courseRepository.save(course);
        return courseMapper.toResponse(course, currentUser.getId());
    }

    @Transactional(readOnly = true)
    public PagingResult<CourseResponse> getAllCourses(PaginationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();

        Pageable pageable = PaginationUtils.getPageable(request);
        Page<Course> coursesPage = courseRepository.findByOwnerOrMember(currentUser.getId(), pageable);

        List<CourseResponse> content = coursesPage.getContent()
                .stream()
                .map(c -> courseMapper.toResponse(c, currentUser.getId()))
                .collect(Collectors.toList());

        return new PagingResult<>(
                content,
                coursesPage.getTotalPages(),
                coursesPage.getTotalElements(),
                coursesPage.getSize(),
                coursesPage.getNumber(),
                coursesPage.isEmpty()
        );
    }

    @Transactional(readOnly = true)
    public CourseResponse getCourseById(Long courseId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Course course = resolveCourseForViewing(courseId, currentUser);
        return courseMapper.toResponse(course, currentUser.getId());
    }

    @Transactional
    public CourseResponse updateCourse(Long courseId, CourseRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        Course course = courseRepository.findByIdAndUserIdAndDeletedFalse(courseId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        Term term = resolveTerm(request.getTermId(), currentUser);

        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setTerm(term);
        course.setColorTag(request.getColorTag());
        course.setInstructorName(request.getInstructorName());
        course.setInstructorEmail(request.getInstructorEmail());

        course = courseRepository.save(course);
        return courseMapper.toResponse(course, currentUser.getId());
    }

    @Transactional
    public void deleteCourse(Long courseId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Course course = courseRepository.findByIdAndUserIdAndDeletedFalse(courseId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        // Soft delete — a hard delete blocks on the FK from any note that still
        // references this course, and would otherwise pull the rug out from under it.
        course.setDeleted(true);
        courseRepository.save(course);
    }

    @Transactional(readOnly = true)
    public CourseProgressResponse getCourseProgress(Long courseId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Course course = resolveCourseForViewing(courseId, currentUser);

        long completedTasks = taskRepository.countByCourseIdAndCompleted(courseId, true);
        long incompleteTasks = taskRepository.countByCourseIdAndCompleted(courseId, false);
        long totalTasks = completedTasks + incompleteTasks;

        double progressPercentage = totalTasks > 0 ? (completedTasks * 100.0) / totalTasks : 0.0;

        return CourseProgressResponse.builder()
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .progressPercentage(Math.round(progressPercentage * 100.0) / 100.0)
                .build();
    }

    @Transactional
    public void inviteMember(Long courseId, Long friendUserId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Course course = courseRepository.findByIdAndUserIdAndDeletedFalse(courseId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        if (friendUserId.equals(currentUser.getId())) {
            throw new BadRequestException("You're already the owner of this course");
        }
        if (!friendService.areFriends(currentUser.getId(), friendUserId)) {
            throw new BadRequestException("You can only invite friends to a course");
        }

        User invitee = userRepository.findById(friendUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + friendUserId));

        boolean alreadyInvolved = courseMemberRepository.findByCourseIdAndUserId(course.getId(), invitee.getId()).isPresent();
        if (alreadyInvolved) {
            return;
        }

        CourseMember member = CourseMember.builder()
                .course(course)
                .user(invitee)
                .status(MemberStatus.INVITED)
                .build();
        courseMemberRepository.save(member);

        notificationService.notify(invitee, NotificationType.COURSE_INVITE,
                "Course invite",
                displayName(currentUser) + " invited you to \"" + course.getTitle() + "\"",
                "/courses/" + course.getId());
    }

    @Transactional
    public void acceptInvite(Long courseId) {
        User currentUser = currentUserProvider.getCurrentUser();
        CourseMember member = courseMemberRepository.findByCourseIdAndUserId(courseId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No invite found for this course"));

        if (member.getStatus() != MemberStatus.INVITED) {
            throw new BadRequestException("This invite is no longer pending");
        }

        member.setStatus(MemberStatus.ACTIVE);
        member.setJoinedAt(LocalDateTime.now());
        courseMemberRepository.save(member);
    }

    @Transactional
    public void removeMember(Long courseId, Long userId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Course course = courseRepository.findByIdAndUserIdAndDeletedFalse(courseId, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        CourseMember member = courseMemberRepository.findByCourseIdAndUserId(course.getId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("This user isn't a member of this course"));

        courseMemberRepository.delete(member);
    }

    @Transactional(readOnly = true)
    public List<CourseMemberResponse> listMembers(Long courseId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Course course = resolveCourseForViewing(courseId, currentUser);

        List<CourseMemberResponse> result = new ArrayList<>();
        result.add(CourseMemberResponse.builder()
                .userId(course.getUser().getId())
                .displayName(displayName(course.getUser()))
                .email(course.getUser().getEmail())
                .avatarUrl(course.getUser().getAvatarUrl())
                .status(MemberStatus.ACTIVE)
                .isOwner(true)
                .build());

        for (CourseMember m : courseMemberRepository.findByCourseIdOrderByCreatedAtAsc(course.getId())) {
            result.add(CourseMemberResponse.builder()
                    .userId(m.getUser().getId())
                    .displayName(displayName(m.getUser()))
                    .email(m.getUser().getEmail())
                    .avatarUrl(m.getUser().getAvatarUrl())
                    .status(m.getStatus())
                    .isOwner(false)
                    .joinedAt(m.getJoinedAt())
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public PagingResult<TaskResponse> getTeamTasks(Long courseId, PaginationRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        resolveCourseForViewing(courseId, currentUser);

        Pageable pageable = PaginationUtils.getPageable(request);
        Page<Task> taskPage = taskRepository.findByCourseId(courseId, pageable);

        List<TaskResponse> content = taskPage.getContent().stream()
                .map(taskMapper::toResponse)
                .collect(Collectors.toList());

        return new PagingResult<>(
                content,
                taskPage.getTotalPages(),
                taskPage.getTotalElements(),
                taskPage.getSize(),
                taskPage.getNumber(),
                taskPage.isEmpty()
        );
    }

    @Transactional(readOnly = true)
    public CourseProgressResponse getMemberProgress(Long courseId, Long userId) {
        User currentUser = currentUserProvider.getCurrentUser();
        Course course = resolveCourseForViewing(courseId, currentUser);

        long completedTasks = taskRepository.countByCourseIdAndUserIdAndCompleted(courseId, userId, true);
        long incompleteTasks = taskRepository.countByCourseIdAndUserIdAndCompleted(courseId, userId, false);
        long totalTasks = completedTasks + incompleteTasks;

        double progressPercentage = totalTasks > 0 ? (completedTasks * 100.0) / totalTasks : 0.0;

        return CourseProgressResponse.builder()
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .progressPercentage(Math.round(progressPercentage * 100.0) / 100.0)
                .build();
    }

    private String displayName(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }
}
