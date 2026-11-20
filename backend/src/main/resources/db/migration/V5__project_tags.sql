-- project-tags D1/D3/D4: workspace-scoped tags with a project pivot.
-- tags gets its own (id, workspace_id) unique target so project_tags can
-- enforce tenancy at the DB level via composite FKs — same pattern as
-- tasks -> projects (V3) and comments -> tasks (V4). No JPA entity for the
-- pivot and no surrogate key: (project_id, tag_id) is the identity.
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(50) NOT NULL,
    color VARCHAR(20),
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tags_id_workspace UNIQUE (id, workspace_id)
);
CREATE UNIQUE INDEX uq_tags_workspace_title ON tags(workspace_id, lower(title));
CREATE INDEX idx_tags_workspace ON tags(workspace_id);

CREATE TABLE project_tags (
    project_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    workspace_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, tag_id),
    CONSTRAINT fk_project_tags_project_workspace
        FOREIGN KEY (project_id, workspace_id)
        REFERENCES projects(id, workspace_id) ON DELETE CASCADE,
    CONSTRAINT fk_project_tags_tag_workspace
        FOREIGN KEY (tag_id, workspace_id)
        REFERENCES tags(id, workspace_id) ON DELETE CASCADE
);
CREATE INDEX idx_project_tags_tag ON project_tags(tag_id);

ALTER SEQUENCE tags_id_seq RENAME TO tags_seq;
ALTER SEQUENCE tags_seq INCREMENT BY 50;
