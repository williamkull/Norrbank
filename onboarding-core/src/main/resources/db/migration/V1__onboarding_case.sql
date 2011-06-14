-- 2011-06. Original case table, carried forward through the 2019 Java 21 migration.
create table onboarding_case (
    case_id          varchar(20) primary key,
    org_no           varchar(12)  not null,
    legal_name       varchar(200) not null,
    rm_user_id       varchar(40)  not null,
    lifecycle_status varchar(20)  not null,
    opened_at        timestamp    not null,
    updated_at       timestamp    not null
);

create index idx_case_org_no on onboarding_case (org_no);
create index idx_case_rm on onboarding_case (rm_user_id);
create index idx_case_lifecycle on onboarding_case (lifecycle_status);
