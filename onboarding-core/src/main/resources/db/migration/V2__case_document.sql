-- 2013-02. Document register, replacing the shared drive.
create table case_document (
    document_id   bigserial primary key,
    case_id       varchar(20) not null references onboarding_case (case_id),
    document_type varchar(40) not null,
    archive_ref   varchar(64) not null,
    received_at   timestamp   not null,
    verified_at   timestamp
);

create index idx_document_case on case_document (case_id);
