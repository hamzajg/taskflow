package com.taskflow.dto;

import com.taskflow.model.TimeEntry;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class TimeEntryDtos {

    private TimeEntryDtos() {
    }

    public record TimeEntryDto(
            Long id,
            Long taskId,
            String taskTitle,
            Long userId,
            String userName,
            LocalDate entryDate,
            Integer minutes,
            Instant startedAt,
            Instant endedAt,
            boolean running,
            String description,
            Instant createdAt) {
        public static TimeEntryDto of(TimeEntry e, String taskTitle, String userName) {
            return new TimeEntryDto(e.id, e.taskId, taskTitle, e.userId, userName,
                    e.entryDate, e.minutes, e.startedAt, e.endedAt, e.isRunning(),
                    e.description, e.createdAt);
        }
    }

    /** GET /tasks/{id}/time-entries — entries plus the caller's running timer. */
    public record TimeEntryList(List<TimeEntryDto> entries, TimeEntryDto running) {
    }
}
