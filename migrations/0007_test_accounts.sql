create table if not exists test_accounts (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into test_accounts (email)
values ('ygodds18@gmail.com')
on conflict (email) do nothing;

alter table payments add column if not exists user_id text;
alter table payments add column if not exists counts_revenue boolean default true;

update payments p
set counts_revenue = false
from "user" u
where u.id = p.user_id
  and exists (select 1 from test_accounts t where t.email = lower(trim(u.email)));

create or replace function exclude_test_account_revenue()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1
    from "user" u
    join test_accounts t on t.email = lower(trim(u.email))
    where u.id = new.user_id
  ) then
    new.counts_revenue := false;
  end if;
  return new;
end;
$$;

create trigger payments_test_account_revenue
before insert or update on payments
for each row execute function exclude_test_account_revenue();
