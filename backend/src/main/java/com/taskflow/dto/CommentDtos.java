package com.taskflow.dto;

import com.taskflow.model.Comment;

import java.time.Instant;
import java.util.List;

public final class CommentDtos {

    private CommentDtos() {
    }

    public record CommentDto(
            Long id,
            Long taskId,
            Long authorId,
            String authorName,
            String body,
            Instant createdAt,
            Instant updatedAt) {
        public static CommentDto of(Comment c, String authorName) {
            return new CommentDto(c.id, c.taskId, c.authorId, authorName,
                    c.body, c.createdAt, c.updatedAt);
        }
    }

    /** GET /tasks/{id}/comments — newest-200 window, chronological asc. */
    public record CommentListDto(List<CommentDto> comments, boolean hasMore) {
    }
}
