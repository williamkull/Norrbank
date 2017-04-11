-- 2017-04. KYC file split out of the case row when the risk model changed.
create table kyc_file (
    case_id             varchar(20) primary key references onboarding_case (case_id),
    risk_rating         varchar(10) not null,
    ownership_evidenced boolean     not null default false,
    next_review_date    date,
    updated_at          timestamp   not null
);

create table beneficial_owner (
    owner_id             bigserial primary key,
    case_id              varchar(20)  not null references onboarding_case (case_id),
    full_name            varchar(200) not null,
    date_of_birth        date,
    country_of_residence varchar(2)   not null,
    ownership_percent    integer      not null,
    registry_confirmed   boolean      not null default false
);

create table case_director (
    director_id  bigserial primary key,
    case_id      varchar(20)  not null references onboarding_case (case_id),
    full_name    varchar(200) not null,
    role         varchar(60)  not null,
    is_signatory boolean      not null default false
);

create index idx_bo_case on beneficial_owner (case_id);
create index idx_director_case on case_director (case_id);
