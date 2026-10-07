alter table payments add column if not exists purpose text not null default 'session';
alter table payments add constraint payments_purpose_check check (purpose in ('session', 'activation'));
create unique index payments_one_activation_per_user
on payments (user_id)
where purpose = 'activation' and status in ('pending', 'confirmed');
