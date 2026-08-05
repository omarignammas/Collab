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
import org.test.backendprojecty.dtos.request.CourseRequest;
import org.test.backendprojecty.dtos.request.PaginationRequest;
import org.test.backendprojecty.dtos.response.CourseMemberResponse;
import org.test.backendprojecty.dtos.response.CourseProgressResponse;
import org.test.backendprojecty.dtos.response.CourseResponse;
import org.test.backendprojecty.dtos.response.PagingResult;
import org.test.backendprojecty.entity.Course;
import org.test.backendprojecty.entity.CourseMember;
import org.test.backendprojecty.entity.MemberStatus;
import org.test.backendprojecty.entity.NotificationType;
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

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseServiceTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private TermRepository termRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private CourseMemberRepository courseMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseMapper courseMapper;

    @Mock
    private TaskMapper taskMapper;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @Mock
    private FriendService friendService;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private CourseService courseService;

    private User user;
    private User friend;
    private Term term;
    private Course course;
    private CourseRequest courseRequest;
    private CourseResponse courseResponse;
    private PaginationRequest paginationRequest;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .email("test@example.com")
                .firstName("John")
                .lastName("Doe")
                .build();

        friend = User.builder()
                .id(2L)
                .email("friend@example.com")
                .firstName("Jane")
                .lastName("Roe")
                .build();

        term = Term.builder()
                .id(1L)
                .name("Fall 2026")
                .user(user)
                .build();

        course = Course.builder()
                .id(1L)
                .title("Test Course")
                .description("Test Description")
                .term(term)
                .user(user)
                .build();

        courseRequest = CourseRequest.builder()
                .title("Test Course")
                .description("Test Description")
                .termId(1L)
                .build();

        courseResponse = CourseResponse.builder()
                .id(1L)
                .title("Test Course")
                .description("Test Description")
                .termId(1L)
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
    void createCourse_Success() {
        when(termRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(term));
        when(courseRepository.save(any(Course.class))).thenReturn(course);
        when(courseMapper.toResponse(course, 1L)).thenReturn(courseResponse);

        CourseResponse response = courseService.createCourse(courseRequest);

        assertNotNull(response);
        assertEquals("Test Course", response.getTitle());
        verify(courseRepository).save(any(Course.class));
    }

    @Test
    void getAllCourses_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Course> coursePage = new PageImpl<>(Arrays.asList(course), pageable, 1);

        when(courseRepository.findByOwnerOrMember(eq(1L), any(Pageable.class)))
                .thenReturn(coursePage);
        when(courseMapper.toResponse(course, 1L)).thenReturn(courseResponse);

        PagingResult<CourseResponse> result = courseService.getAllCourses(paginationRequest);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(1, result.getTotalPages());
        assertEquals(1L, result.getTotalElements());
        assertEquals(1, result.getPage());
        assertEquals("Test Course", result.getContent().iterator().next().getTitle());
        verify(courseRepository).findByOwnerOrMember(eq(1L), any(Pageable.class));
    }

    @Test
    void getCourseById_Owner_Success() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(courseMapper.toResponse(course, 1L)).thenReturn(courseResponse);

        CourseResponse response = courseService.getCourseById(1L);

        assertNotNull(response);
        assertEquals("Test Course", response.getTitle());
    }

    @Test
    void getCourseById_ActiveMember_Success() {
        User viewer = User.builder().id(3L).email("viewer@example.com").build();
        when(currentUserProvider.getCurrentUser()).thenReturn(viewer);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(courseMemberRepository.findByCourseIdAndUserId(1L, 3L)).thenReturn(Optional.of(
                CourseMember.builder().course(course).user(viewer).status(MemberStatus.ACTIVE).build()));
        when(courseMapper.toResponse(course, 3L)).thenReturn(courseResponse);

        CourseResponse response = courseService.getCourseById(1L);

        assertNotNull(response);
    }

    @Test
    void getCourseById_InvitedMember_Success() {
        User viewer = User.builder().id(3L).email("viewer@example.com").build();
        when(currentUserProvider.getCurrentUser()).thenReturn(viewer);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(courseMemberRepository.findByCourseIdAndUserId(1L, 3L)).thenReturn(Optional.of(
                CourseMember.builder().course(course).user(viewer).status(MemberStatus.INVITED).build()));
        when(courseMapper.toResponse(course, 3L)).thenReturn(courseResponse);

        CourseResponse response = courseService.getCourseById(1L);

        assertNotNull(response);
    }

    @Test
    void getCourseById_NotOwnerNotMember_ThrowsResourceNotFound() {
        User stranger = User.builder().id(99L).email("stranger@example.com").build();
        when(currentUserProvider.getCurrentUser()).thenReturn(stranger);
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(courseMemberRepository.findByCourseIdAndUserId(1L, 99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> courseService.getCourseById(1L));
    }

    @Test
    void getCourseById_NotFound_ThrowsException() {
        when(courseRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> courseService.getCourseById(1L));
    }

    @Test
    void deleteCourse_SoftDeletes_DoesNotHardDelete() {
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));

        courseService.deleteCourse(1L);

        assertTrue(course.isDeleted());
        verify(courseRepository).save(course);
        verify(courseRepository, never()).delete(any(Course.class));
    }

    @Test
    void getCourseProgress_Success() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(taskRepository.countByCourseIdAndCompleted(1L, true)).thenReturn(5L);
        when(taskRepository.countByCourseIdAndCompleted(1L, false)).thenReturn(5L);

        CourseProgressResponse response = courseService.getCourseProgress(1L);

        assertNotNull(response);
        assertEquals(10L, response.getTotalTasks());
        assertEquals(5L, response.getCompletedTasks());
        assertEquals(50.0, response.getProgressPercentage());
    }

    @Test
    void inviteMember_Success_CreatesInvitedMemberAndNotifies() {
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));
        when(friendService.areFriends(1L, 2L)).thenReturn(true);
        when(userRepository.findById(2L)).thenReturn(Optional.of(friend));
        when(courseMemberRepository.findByCourseIdAndUserId(1L, 2L)).thenReturn(Optional.empty());

        courseService.inviteMember(1L, 2L);

        verify(courseMemberRepository).save(argThat(m ->
                m.getUser().equals(friend) && m.getStatus() == MemberStatus.INVITED));
        verify(notificationService).notify(eq(friend), eq(NotificationType.COURSE_INVITE),
                anyString(), anyString(), eq("/courses/1"));
    }

    @Test
    void inviteMember_NonFriend_ThrowsBadRequest() {
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));
        when(friendService.areFriends(1L, 2L)).thenReturn(false);

        assertThrows(BadRequestException.class, () -> courseService.inviteMember(1L, 2L));
        verify(courseMemberRepository, never()).save(any());
    }

    @Test
    void inviteMember_Self_ThrowsBadRequest() {
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));

        assertThrows(BadRequestException.class, () -> courseService.inviteMember(1L, 1L));
    }

    @Test
    void inviteMember_AlreadyInvolved_IsIdempotent() {
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));
        when(friendService.areFriends(1L, 2L)).thenReturn(true);
        when(userRepository.findById(2L)).thenReturn(Optional.of(friend));
        when(courseMemberRepository.findByCourseIdAndUserId(1L, 2L)).thenReturn(Optional.of(
                CourseMember.builder().course(course).user(friend).status(MemberStatus.ACTIVE).build()));

        courseService.inviteMember(1L, 2L);

        verify(courseMemberRepository, never()).save(any());
        verifyNoInteractions(notificationService);
    }

    @Test
    void acceptInvite_Success_TransitionsToActive() {
        when(currentUserProvider.getCurrentUser()).thenReturn(friend);
        CourseMember member = CourseMember.builder().course(course).user(friend).status(MemberStatus.INVITED).build();
        when(courseMemberRepository.findByCourseIdAndUserId(1L, 2L)).thenReturn(Optional.of(member));

        courseService.acceptInvite(1L);

        assertEquals(MemberStatus.ACTIVE, member.getStatus());
        assertNotNull(member.getJoinedAt());
        verify(courseMemberRepository).save(member);
    }

    @Test
    void acceptInvite_NotPending_ThrowsBadRequest() {
        when(currentUserProvider.getCurrentUser()).thenReturn(friend);
        CourseMember member = CourseMember.builder().course(course).user(friend).status(MemberStatus.ACTIVE).build();
        when(courseMemberRepository.findByCourseIdAndUserId(1L, 2L)).thenReturn(Optional.of(member));

        assertThrows(BadRequestException.class, () -> courseService.acceptInvite(1L));
    }

    @Test
    void removeMember_OwnerOnly_Success() {
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.of(course));
        CourseMember member = CourseMember.builder().course(course).user(friend).status(MemberStatus.ACTIVE).build();
        when(courseMemberRepository.findByCourseIdAndUserId(1L, 2L)).thenReturn(Optional.of(member));

        courseService.removeMember(1L, 2L);

        verify(courseMemberRepository).delete(member);
    }

    @Test
    void removeMember_NotOwner_ThrowsResourceNotFound() {
        when(courseRepository.findByIdAndUserIdAndDeletedFalse(1L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> courseService.removeMember(1L, 2L));
    }

    @Test
    void listMembers_IncludesOwnerAndActiveMembers() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        CourseMember member = CourseMember.builder().course(course).user(friend).status(MemberStatus.ACTIVE).build();
        when(courseMemberRepository.findByCourseIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(member));

        List<CourseMemberResponse> result = courseService.listMembers(1L);

        assertEquals(2, result.size());
        assertTrue(result.get(0).isOwner());
        assertEquals(1L, result.get(0).getUserId());
        assertFalse(result.get(1).isOwner());
        assertEquals(2L, result.get(1).getUserId());
    }

    @Test
    void getMemberProgress_Success() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        when(taskRepository.countByCourseIdAndUserIdAndCompleted(1L, 2L, true)).thenReturn(3L);
        when(taskRepository.countByCourseIdAndUserIdAndCompleted(1L, 2L, false)).thenReturn(1L);

        CourseProgressResponse response = courseService.getMemberProgress(1L, 2L);

        assertEquals(4L, response.getTotalTasks());
        assertEquals(3L, response.getCompletedTasks());
        assertEquals(75.0, response.getProgressPercentage());
    }

    @Test
    void getTeamTasks_ReturnsPagedTasksForCourse() {
        when(courseRepository.findById(1L)).thenReturn(Optional.of(course));
        Pageable pageable = PageRequest.of(0, 10);
        Page<org.test.backendprojecty.entity.Task> taskPage = new PageImpl<>(Collections.emptyList(), pageable, 0);
        when(taskRepository.findByCourseId(eq(1L), any(Pageable.class))).thenReturn(taskPage);

        PagingResult<org.test.backendprojecty.dtos.response.TaskResponse> result =
                courseService.getTeamTasks(1L, paginationRequest);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }
}
