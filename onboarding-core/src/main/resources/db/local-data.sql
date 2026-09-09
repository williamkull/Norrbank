-- Local development dataset. Loaded on the `local` profile only.
-- The organisation numbers match the registry drop in local/registry/inbound and the
-- case ids match the stage file in local/screening, so a local run has all three
-- systems holding the same cases.

insert into onboarding_case (case_id, org_no, legal_name, rm_user_id, lifecycle_status, opened_at, updated_at) values
  ('ONB-2026-004101', '5560112233', 'Vasa Logistik AB',        's.lundin', 'APPROVED',       timestamp '2026-05-12 08:20:00', timestamp '2026-06-30 14:02:00'),
  ('ONB-2026-004112', '5566778899', 'Bergslagen Industri AB',  's.lundin', 'DOCS_RECEIVED',  timestamp '2026-07-02 09:40:00', timestamp '2026-07-18 10:15:00'),
  ('ONB-2026-004119', '5569001122', 'Nordkap Shipping AB',     's.lundin', 'DOCS_RECEIVED',  timestamp '2026-07-14 11:05:00', timestamp '2026-08-01 09:30:00'),
  ('ONB-2026-004127', '5562334455', 'Uppsala Bryggeri AB',     'p.astrom', 'APPROVED',       timestamp '2026-06-01 13:15:00', timestamp '2026-07-09 16:40:00'),
  ('ONB-2026-004133', '5564556677', 'Malmö Fastighets AB',     's.lundin', 'DOCS_RECEIVED',  timestamp '2026-07-21 10:00:00', timestamp '2026-08-06 08:55:00'),
  ('ONB-2026-004140', '5567889900', 'Kiruna Mineral AB',       'p.astrom', 'DOCS_RECEIVED',  timestamp '2026-07-28 15:30:00', timestamp '2026-08-11 11:20:00'),
  ('ONB-2026-004148', '5561223344', 'Gävle Kraft & Värme AB',  's.lundin', 'DOCS_REQUESTED', timestamp '2026-08-04 09:10:00', timestamp '2026-08-04 09:10:00'),
  ('ONB-2026-004155', '5568990011', 'Skagerrak Offshore AB',   'p.astrom', 'INITIATED',      timestamp '2026-08-18 14:45:00', timestamp '2026-08-18 14:45:00');

insert into kyc_file (case_id, risk_rating, ownership_evidenced, next_review_date, updated_at) values
  ('ONB-2026-004101', 'LOW',    true,  date '2027-06-30', timestamp '2026-06-30 14:02:00'),
  ('ONB-2026-004112', 'EDD',    false, null,              timestamp '2026-07-18 10:15:00'),
  ('ONB-2026-004119', 'HIGH',   false, null,              timestamp '2026-08-01 09:30:00'),
  ('ONB-2026-004127', 'MEDIUM', true,  date '2027-07-09', timestamp '2026-07-09 16:40:00'),
  ('ONB-2026-004133', 'MEDIUM', false, null,              timestamp '2026-08-06 08:55:00'),
  ('ONB-2026-004140', 'EDD',    false, null,              timestamp '2026-08-11 11:20:00'),
  ('ONB-2026-004148', 'LOW',    false, null,              timestamp '2026-08-04 09:10:00'),
  ('ONB-2026-004155', 'MEDIUM', false, null,              timestamp '2026-08-18 14:45:00');

insert into beneficial_owner (case_id, full_name, date_of_birth, country_of_residence, ownership_percent, registry_confirmed) values
  ('ONB-2026-004101', 'Astrid Hellström',        date '1971-03-14', 'SE', 62, true),
  ('ONB-2026-004112', 'Petter Nyholm',           date '1966-11-02', 'SE', 55, false),
  ('ONB-2026-004112', 'Marit Solberg',           date '1979-07-21', 'NO', 30, false),
  ('ONB-2026-004119', 'Ingrid Wallenberg-Sund',  date '1958-01-30', 'SE', 44, false),
  ('ONB-2026-004127', 'Karl-Johan Lindfors',     date '1974-09-09', 'SE', 100, true),
  ('ONB-2026-004133', 'Elsa Bergqvist',          date '1983-04-17', 'SE', 51, false),
  ('ONB-2026-004140', 'Tuomas Rantanen',         date '1969-12-05', 'FI', 40, false);

insert into case_director (case_id, full_name, role, is_signatory) values
  ('ONB-2026-004101', 'Astrid Hellström',   'Chair',            true),
  ('ONB-2026-004112', 'Petter Nyholm',      'Managing Director', true),
  ('ONB-2026-004112', 'Håkan Ström',        'Board member',     false),
  ('ONB-2026-004119', 'Bente Lie',          'Managing Director', true),
  ('ONB-2026-004133', 'Elsa Bergqvist',     'Chair',            true),
  ('ONB-2026-004140', 'Tuomas Rantanen',    'Managing Director', true),
  ('ONB-2026-004148', 'Lars-Erik Sundberg', 'Chair',            true);

insert into case_document (case_id, document_type, archive_ref, received_at, verified_at) values
  ('ONB-2026-004101', 'CERTIFICATE_OF_INCORPORATION',     'ARC-771201', timestamp '2026-05-14 10:00:00', timestamp '2026-05-15 09:00:00'),
  ('ONB-2026-004101', 'ARTICLES_OF_ASSOCIATION',          'ARC-771202', timestamp '2026-05-14 10:00:00', timestamp '2026-05-15 09:00:00'),
  ('ONB-2026-004101', 'OWNERSHIP_STRUCTURE',              'ARC-771203', timestamp '2026-05-14 10:00:00', timestamp '2026-05-15 09:00:00'),
  ('ONB-2026-004101', 'TAX_RESIDENCY_SELF_CERTIFICATION', 'ARC-771204', timestamp '2026-05-14 10:00:00', timestamp '2026-05-15 09:00:00'),
  ('ONB-2026-004112', 'CERTIFICATE_OF_INCORPORATION',     'ARC-778801', timestamp '2026-07-05 11:30:00', timestamp '2026-07-06 08:20:00'),
  ('ONB-2026-004112', 'ARTICLES_OF_ASSOCIATION',          'ARC-778802', timestamp '2026-07-05 11:30:00', null),
  ('ONB-2026-004112', 'OWNERSHIP_STRUCTURE',              'ARC-778803', timestamp '2026-07-12 09:15:00', null),
  ('ONB-2026-004119', 'CERTIFICATE_OF_INCORPORATION',     'ARC-779901', timestamp '2026-07-18 14:00:00', timestamp '2026-07-19 10:00:00'),
  ('ONB-2026-004119', 'ARTICLES_OF_ASSOCIATION',          'ARC-779902', timestamp '2026-07-18 14:00:00', null),
  ('ONB-2026-004127', 'CERTIFICATE_OF_INCORPORATION',     'ARC-772301', timestamp '2026-06-03 09:00:00', timestamp '2026-06-04 09:00:00'),
  ('ONB-2026-004127', 'ARTICLES_OF_ASSOCIATION',          'ARC-772302', timestamp '2026-06-03 09:00:00', timestamp '2026-06-04 09:00:00'),
  ('ONB-2026-004127', 'OWNERSHIP_STRUCTURE',              'ARC-772303', timestamp '2026-06-03 09:00:00', timestamp '2026-06-04 09:00:00'),
  ('ONB-2026-004127', 'TAX_RESIDENCY_SELF_CERTIFICATION', 'ARC-772304', timestamp '2026-06-03 09:00:00', timestamp '2026-06-04 09:00:00'),
  ('ONB-2026-004133', 'CERTIFICATE_OF_INCORPORATION',     'ARC-774501', timestamp '2026-07-24 10:45:00', timestamp '2026-07-25 08:30:00'),
  ('ONB-2026-004133', 'OWNERSHIP_STRUCTURE',              'ARC-774502', timestamp '2026-07-24 10:45:00', null),
  ('ONB-2026-004140', 'CERTIFICATE_OF_INCORPORATION',     'ARC-776701', timestamp '2026-07-30 13:20:00', timestamp '2026-07-31 09:10:00'),
  ('ONB-2026-004140', 'ARTICLES_OF_ASSOCIATION',          'ARC-776702', timestamp '2026-07-30 13:20:00', null);

insert into case_approval (case_id, approver_id, decision, procedure_stage_code, decided_at) values
  ('ONB-2026-004101', 'o.haddad',    'APPROVE', 'EDD-COMPLETE', timestamp '2026-06-30 13:50:00'),
  ('ONB-2026-004101', 'm.lindqvist', 'APPROVE', 'EDD-COMPLETE', timestamp '2026-06-30 14:02:00'),
  ('ONB-2026-004127', 'o.haddad',    'APPROVE', 'EDD-COMPLETE', timestamp '2026-07-09 16:20:00'),
  ('ONB-2026-004127', 'm.lindqvist', 'APPROVE', 'EDD-COMPLETE', timestamp '2026-07-09 16:40:00');

insert into screening_result (case_id, party_ref, list_name, outcome, run_date) values
  ('ONB-2026-004112', 'Petter Nyholm',          'EU_CONSOLIDATED_SANCTIONS', 'CLEAR',          timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004112', 'Petter Nyholm',          'PEP_GLOBAL',                'CLEAR',          timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004112', 'Marit Solberg',          'EU_CONSOLIDATED_SANCTIONS', 'CLEAR',          timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004112', 'Marit Solberg',          'ADVERSE_MEDIA',             'POSSIBLE_MATCH', timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004119', 'Ingrid Wallenberg-Sund', 'PEP_GLOBAL',                'POSSIBLE_MATCH', timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004119', 'Bente Lie',              'EU_CONSOLIDATED_SANCTIONS', 'CLEAR',          timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004133', 'Elsa Bergqvist',         'EU_CONSOLIDATED_SANCTIONS', 'CLEAR',          timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004133', 'Elsa Bergqvist',         'PEP_GLOBAL',                'CLEAR',          timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004140', 'Tuomas Rantanen',        'OFAC_SDN',                  'PENDING_REVIEW', timestamp '2026-09-05 02:03:00');

-- ONB-2140. registry_evidence belongs to registry-link and arrives with its own schema.sql
-- in every deployed environment; the local profile builds its shape from entities only, so
-- the table has to be made here before it can be seeded. Without these rows the status
-- panel cannot be run or seen locally at all.
create table if not exists registry_evidence (
    org_no              varchar(12) primary key,
    legal_name          varchar(200) not null,
    evidence_status     varchar(30)  not null,
    expected_completion date,
    ubo_name            varchar(200),
    updated_at          date         not null
);

insert into registry_evidence (org_no, legal_name, evidence_status, expected_completion, ubo_name, updated_at) values
  ('5560112233', 'Vasa Logistik AB',       'REGISTRY_COMPLETE', null,              'Astrid Hellström',       date '2026-06-28'),
  ('5566778899', 'Bergslagen Industri AB', 'REGISTRY_PENDING',  date '2026-09-24', 'Petter Nyholm',          date '2026-09-04'),
  ('5569001122', 'Nordkap Shipping AB',    'UBO_UNCONFIRMED',   date '2026-09-16', 'Ingrid Wallenberg-Sund', date '2026-09-04'),
  ('5562334455', 'Uppsala Bryggeri AB',    'REGISTRY_COMPLETE', null,              'Karl-Johan Lindfors',    date '2026-07-07'),
  ('5564556677', 'Malmö Fastighets AB',    'REGISTRY_PENDING',  date '2026-09-08', 'Elsa Bergqvist',         date '2026-09-04'),
  ('5567889900', 'Kiruna Mineral AB',      'UBO_UNCONFIRMED',   date '2026-09-30', 'Tuomas Rantanen',        date '2026-09-04'),
  ('5561223344', 'Gävle Kraft & Värme AB', 'REGISTRY_PENDING',  null,              null,                     date '2026-09-04'),
  ('5568990011', 'Skagerrak Offshore AB',  'REGISTRY_PENDING',  null,              null,                     date '2026-09-04');

-- The stage the run of 2026-09-05 left behind, one row per open case. Written by
-- screening_batch in every environment; seeded here so a local workspace has something to
-- show. The stages are what ScreeningRules derives from the screening_result rows above.
insert into case_stage (case_id, stage, procedure_stage_code, expected_decision_date, stage_since, run_id, derived_at) values
  ('ONB-2026-004112', 'AWAITING_REGISTRY_EVIDENCE', 'EDD-PENDING',   null,              timestamp '2026-08-22 02:03:00', 'a1b2c3d4', timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004119', 'UNDER_ANALYST_REVIEW',       'PEP-REVIEW',    date '2026-09-12', timestamp '2026-09-02 02:03:00', 'a1b2c3d4', timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004133', 'READY_FOR_DECISION',         'EDD-COMPLETE',  date '2026-09-06', timestamp '2026-09-04 02:03:00', 'a1b2c3d4', timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004140', 'ON_HOLD',                    'SAN-HOLD',      null,              timestamp '2026-08-28 02:03:00', 'a1b2c3d4', timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004148', 'DOCUMENTS_OUTSTANDING',      'SCR-QUEUED',    date '2026-09-10', timestamp '2026-09-05 02:03:00', 'a1b2c3d4', timestamp '2026-09-05 02:03:00'),
  ('ONB-2026-004155', 'DOCUMENTS_OUTSTANDING',      'SCR-QUEUED',    date '2026-09-10', timestamp '2026-09-05 02:03:00', 'a1b2c3d4', timestamp '2026-09-05 02:03:00');
