-- time-tracking D1/D2/D3: task-scoped time entries with composite-FK
-- tenancy (same pattern as comments/project_tags). minutes is canonical;
-- timer entries carry started_at/ended_at (ended_at NULL = running).
-- CHECK enforces the three legal shapes: manual (minutes only), running
-- timer (started_at, no ended_at, no minutes), stopped timer (all set).
CREATE TABLE time_entries (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    workspace_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id),
    entry_date DATE NOT NULL,
    minutes INT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    description VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_time_entries_task_workspace
        FOREIGN KEY (task_id, workspace_id)
        REFERENCES tasks(id, workspace_id) ON DELETE CASCADE,
    CONSTRAINT chk_time_entry_shape CHECK (
        (started_at IS NULL AND ended_at IS NULL AND minutes IS NOT NULL)
        OR (started_at IS NOT NULL AND ended_at IS NULL AND minutes IS NULL)
        OR (started_at IS NOT NULL AND ended_at IS NOT NULL AND minutes IS NOT NULL)
    )
);
CREATE INDEX idx_time_entries_task ON time_entries(task_id, entry_date, id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_workspace ON time_entries(workspace_id);

-- D3: at most one running timer per user, globally. Manual entries have
-- started_at NULL so they never collide.
CREATE UNIQUE INDEX uq_time_entries_running
    ON time_entries(user_id) WHERE started_at IS NOT NULL AND ended_at IS NULL;

ALTER SEQUENCE time_entries_id_seq RENAME TO time_entries_seq;
ALTER SEQUENCE time_entries_seq INCREMENT BY 50;
