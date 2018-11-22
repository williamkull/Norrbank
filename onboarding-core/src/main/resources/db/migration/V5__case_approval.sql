-- 2018-11. Four-eyes approval moved out of the ops console and into the service.
create table case_approval (
    approval_id          bigserial primary key,
    case_id              varchar(20) not null references onboarding_case (case_id),
    approver_id          varchar(40) not null,
    decision             varchar(30) not null,
    procedure_stage_code varchar(30) not null,
    decided_at           timestamp   not null
);

create unique index uq_approval_case_approver on case_approval (case_id, approver_id);
