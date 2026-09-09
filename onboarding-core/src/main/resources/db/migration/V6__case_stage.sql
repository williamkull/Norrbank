-- 2026-09. ONB-2140. One row per case the nightly screening run staged.
--
-- Written by screening_batch, selected by onboarding_core, and by nobody else. The stage
-- file the ops console reads is unchanged and remains operations' surface; this table is
-- the same derivation reaching an interactive request without going near the file or its
-- lock.
--
-- stage_since is the anchor: it holds the instant the case entered the stage it is in, so
-- expected_decision_date is computed once from that instant and does not advance every
-- night while a case stands still.
create table case_stage (
    case_id                varchar(20) primary key references onboarding_case (case_id),
    stage                  varchar(30) not null,
    procedure_stage_code   varchar(30) not null,
    expected_decision_date date,
    stage_since            timestamp   not null,
    run_id                 varchar(16),
    derived_at             timestamp   not null
);

create index idx_case_stage_derived on case_stage (derived_at);
