-- 2011-09. Written by screening-batch after each nightly run. Read-only for everyone else.
create table screening_result (
    result_id  bigserial primary key,
    case_id    varchar(20) not null,
    party_ref  varchar(64) not null,
    list_name  varchar(40) not null,
    outcome    varchar(20) not null,
    run_date   timestamp   not null
);

create index idx_screening_case on screening_result (case_id);
create index idx_screening_run on screening_result (run_date);
