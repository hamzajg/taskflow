package com.taskflow.service;

import com.taskflow.dto.TimeEntryDtos.TimeEntryDto;
import com.taskflow.dto.TimeEntryDtos.TimeEntryList;
import com.taskflow.model.Task;
import com.taskflow.model.TimeEntry;
import com.taskflow.model.User;
import com.taskflow.model.WorkspaceMember;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.taskflow.service.WorkspaceService.Membership;

@ApplicationScoped
public class TimeEntryService {

    @Inject
    WorkspaceService workspaceService;

    @Inject
    ProjectService projectService;

    private Task requireTask(Long taskId, Long userId) {
        Task t = Task.findById(taskId);
        if (t == null) {
            throw new WebApplicationException("Task not found", Response.Status.NOT_FOUND);
        }
        projectService.requireProject(t.projectId, userId);
        return t;
    }

    private Membership membershipOf(TimeEntry e, Long userId) {
        return workspaceService.requireMembership(e.workspaceId, userId);
    }

    /** Entries of a task (newest first) plus the caller's running timer. */
    public TimeEntryList list(User user, Long taskId) {
        Task t = requireTask(taskId, user.id);
        List<TimeEntry> entries = TimeEntry.list(
                "taskId = ?1 order by entryDate desc, createdAt desc, id desc", t.id);
        return new TimeEntryList(toDtos(entries), runningDto(user));
    }

    @Transactional
    public TimeEntryDto create(User user, Long taskId, LocalDate entryDate,
                               Integer minutes, String description) {
        Task t = requireTask(taskId, user.id);
        workspaceService.requireVerified(user);
        validateManual(entryDate, minutes, description);

        TimeEntry e = new TimeEntry();
        e.taskId = t.id;
        e.workspaceId = t.workspaceId;
        e.userId = user.id;
        e.entryDate = entryDate;
        e.minutes = minutes;
        e.description = cleanDescription(description);
        e.persist();
        return toDto(e, t.title, user.displayName());
    }

    @Transactional
    public TimeEntryDto update(User user, Long entryId, LocalDate entryDate,
                               Integer minutes, String description) {
        TimeEntry e = requireEntry(entryId, user.id);
        if (!e.userId.equals(user.id)) {
            throw new WebApplicationException("Only the author can edit a time entry",
                    Response.Status.FORBIDDEN);
        }
        if (e.isRunning()) {
            throw conflict("Stop the running timer before editing this entry");
        }
        if (entryDate != null) {
            requireNotFuture(entryDate);
            e.entryDate = entryDate;
        }
        if (minutes != null) {
            requireMinutes(minutes);
            e.minutes = minutes;
        }
        if (description != null) {
            if (description.trim().length() > TimeEntry.MAX_DESCRIPTION_LENGTH) {
                throw badRequest("description is too long");
            }
            e.description = cleanDescription(description);
        }
        e.updatedAt = Instant.now();
        return toDto(e, taskTitle(e.taskId), userName(e.userId));
    }

    @Transactional
    public void delete(User user, Long entryId) {
        TimeEntry e = requireEntry(entryId, user.id);
        if (!e.userId.equals(user.id)) {
            Membership mb = membershipOf(e, user.id);
            workspaceService.requireRole(mb,
                    WorkspaceMember.ROLE_OWNER, WorkspaceMember.ROLE_ADMIN);
        } else if (e.isRunning()) {
            throw conflict("Stop the running timer before deleting this entry");
        }
        TimeEntry.deleteById(entryId);
    }

    /** Start the caller's timer on a task; 409 if one is already running. */
    @Transactional
    public TimeEntryDto timerStart(User user, Long taskId) {
        Task t = requireTask(taskId, user.id);
        workspaceService.requireVerified(user);
        TimeEntry running = runningEntry(user.id);
        if (running != null) {
            throw conflictWithTask("A timer is already running", running.taskId);
        }
        TimeEntry e = new TimeEntry();
        e.taskId = t.id;
        e.workspaceId = t.workspaceId;
        e.userId = user.id;
        e.entryDate = LocalDate.now();
        e.startedAt = Instant.now();
        try {
            e.persist();
            EntityManager em = TimeEntry.getEntityManager();
            em.flush();
        } catch (PersistenceException ex) {
            throw conflictWithTask("A timer is already running", t.id);
        }
        return toDto(e, t.title, user.displayName());
    }

    /** Stop the caller's running timer; computes minutes (nearest, min 1). */
    @Transactional
    public TimeEntryDto timerStop(User user) {
        TimeEntry e = runningEntry(user.id);
        if (e == null) {
            throw new WebApplicationException("No running timer", Response.Status.CONFLICT);
        }
        Instant end = Instant.now();
        long seconds = Duration.between(e.startedAt, end).getSeconds();
        e.minutes = (int) Math.max(1, Math.round(seconds / 60.0));
        e.endedAt = end;
        e.updatedAt = end;
        return toDto(e, taskTitle(e.taskId), userName(e.userId));
    }

    /** The caller's running entry across all workspaces, or null. */
    public TimeEntryDto running(User user) {
        return runningDto(user);
    }

    /** Batch totals: taskId → summed minutes (running entries contribute NULL). */
    @SuppressWarnings("unchecked")
    public Map<Long, Long> totalsForTasks(Collection<Long> taskIds) {
        Map<Long, Long> totals = new HashMap<>();
        if (taskIds == null || taskIds.isEmpty()) {
            return totals;
        }
        List<Object[]> rows = TimeEntry.getEntityManager().createQuery(
                        "select taskId, sum(minutes) from TimeEntry"
                                + " where taskId in ?1 and minutes is not null group by taskId")
                .setParameter(1, taskIds)
                .getResultList();
        for (Object[] row : rows) {
            totals.put((Long) row[0], ((Number) row[1]).longValue());
        }
        return totals;
    }

    private TimeEntry runningEntry(Long userId) {
        return TimeEntry.find(
                "userId = ?1 and startedAt is not null and endedAt is null", userId)
                .firstResult();
    }

    private TimeEntryDto runningDto(User user) {
        TimeEntry e = runningEntry(user.id);
        return e == null ? null : toDto(e, taskTitle(e.taskId), user.displayName());
    }

    private TimeEntry requireEntry(Long entryId, Long userId) {
        TimeEntry e = TimeEntry.findById(entryId);
        if (e == null) {
            throw new WebApplicationException("Time entry not found", Response.Status.NOT_FOUND);
        }
        workspaceService.requireMembership(e.workspaceId, userId);
        return e;
    }

    private void validateManual(LocalDate entryDate, Integer minutes, String description) {
        if (entryDate == null) {
            throw badRequest("entryDate is required");
        }
        requireNotFuture(entryDate);
        if (minutes == null) {
            throw badRequest("minutes is required");
        }
        requireMinutes(minutes);
        if (description != null && description.trim().length() > TimeEntry.MAX_DESCRIPTION_LENGTH) {
            throw badRequest("description is too long");
        }
    }

    private static void requireNotFuture(LocalDate date) {
        if (date.isAfter(LocalDate.now())) {
            throw badRequest("entryDate cannot be in the future");
        }
    }

    private static void requireMinutes(int minutes) {
        if (minutes < 1 || minutes > TimeEntry.MAX_MANUAL_MINUTES) {
            throw badRequest("minutes must be between 1 and 1440");
        }
    }

    private static String cleanDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }

    private String taskTitle(Long taskId) {
        Task t = Task.findById(taskId);
        return t == null ? null : t.title;
    }

    private String userName(Long userId) {
        User u = User.findById(userId);
        return u == null ? null : u.displayName();
    }

    private List<TimeEntryDto> toDtos(List<TimeEntry> entries) {
        Map<Long, String> userNames = new HashMap<>();
        for (TimeEntry e : entries) {
            userNames.computeIfAbsent(e.userId, this::userName);
        }
        Map<Long, String> taskTitles = new HashMap<>();
        for (TimeEntry e : entries) {
            taskTitles.computeIfAbsent(e.taskId, this::taskTitle);
        }
        return entries.stream()
                .map(e -> TimeEntryDto.of(e, taskTitles.get(e.taskId), userNames.get(e.userId)))
                .toList();
    }

    private TimeEntryDto toDto(TimeEntry e, String taskTitle, String userName) {
        return TimeEntryDto.of(e, taskTitle, userName);
    }

    private static WebApplicationException badRequest(String message) {
        return new WebApplicationException(message, Response.Status.BAD_REQUEST);
    }

    private static WebApplicationException conflict(String message) {
        return new WebApplicationException(
                Response.status(Response.Status.CONFLICT).entity(Map.of("error", message)).build());
    }

    private static WebApplicationException conflictWithTask(String message, Long taskId) {
        return new WebApplicationException(Response.status(Response.Status.CONFLICT)
                .entity(Map.of("error", message, "taskId", taskId)).build());
    }
}
