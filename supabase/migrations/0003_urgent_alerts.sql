-- Call First: URGENT alerts. The parent hung up on a worrying phone call, or tapped "I already
-- sent money, clicked, or shared something". An URGENT alert about a phone call has no check,
-- so it has no verdict. The family can answer with "I'm calling you now." (calling_now).
-- Safe to run more than once. A server still running the previous code keeps working: it always
-- sends a verdict and never reads the new column.

alter table alerts add column if not exists urgent text;

alter table alerts drop constraint if exists alerts_urgent_check;
alter table alerts add constraint alerts_urgent_check
  check (urgent in ('phone_call', 'sent_money', 'shared_code', 'gave_card', 'remote_access'));

alter table alerts alter column verdict drop not null;

-- Every alert is either a check result or URGENT (or both).
alter table alerts drop constraint if exists alerts_verdict_or_urgent;
alter table alerts add constraint alerts_verdict_or_urgent check (verdict is not null or urgent is not null);

alter table alerts drop constraint if exists alerts_reply_kind_check;
alter table alerts add constraint alerts_reply_kind_check
  check (reply_kind in ('calling', 'fine', 'wait', 'custom', 'calling_now'));
