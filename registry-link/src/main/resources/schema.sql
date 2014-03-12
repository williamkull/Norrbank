-- registry_evidence. Owned by registry-link, written only by its importer.
create table if not exists registry_evidence (
    org_no              varchar(12) primary key,
    legal_name          varchar(200) not null,
    evidence_status     varchar(30)  not null,
    expected_completion date,
    ubo_name            varchar(200),
    updated_at          date         not null
);

create index if not exists idx_registry_status on registry_evidence (evidence_status);
