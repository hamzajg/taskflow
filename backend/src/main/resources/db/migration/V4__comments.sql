-- task-detail D1: comments are task child records; the composite FK keeps
-- comments.workspace_id provably equal to the task's workspace, same as
-- tasks -> projects. tasks needed the (id, workspace_id) unique target first.
ALTER TABLE tasks
    ADD CONSTRAINT uq_tasks_id_workspace UNIQUE (id, workspace_id);

CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    workspace_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_comments_task_workspace
        FOREIGN KEY (task_id, workspace_id)
        REFERENCES tasks(id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX idx_comments_task_created ON comments(task_id, created_at, id);

ALTER SEQUENCE comments_id_seq RENAME TO comments_seq;
ALTER SEQUENCE comments_seq INCREMENT BY 50;
