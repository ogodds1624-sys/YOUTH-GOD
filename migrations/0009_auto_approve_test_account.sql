alter table payments add column if not exists confirmed_at timestamptz;

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
  if new.status = 'pending' and exists (
    select 1 from "user" u
    where u.id = new.user_id and lower(trim(u.email)) = 'ygodds18@gmail.com'
  ) then
    new.status := 'confirmed';
    new.confirmed_at := now();
    new.counts_revenue := false;
  end if;
  return new;
end;
$$;

update payments p
set status = 'confirmed', confirmed_at = now(), counts_revenue = false
from "user" u
where u.id = p.user_id
  and lower(trim(u.email)) = 'ygodds18@gmail.com'
  and p.status = 'pending';
