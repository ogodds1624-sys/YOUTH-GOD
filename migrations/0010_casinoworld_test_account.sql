insert into test_accounts (email)
values ('casinoworld@gmail.com')
on conflict (email) do nothing;

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
    where u.id = new.user_id
      and lower(trim(u.email)) in ('ygodds18@gmail.com', 'casinoworld@gmail.com')
  ) then
    new.status := 'confirmed';
    new.confirmed_at := now();
    new.counts_revenue := false;
  end if;
  return new;
end;
$$;

update payments p
set counts_revenue = false,
    status = case when p.status = 'pending' then 'confirmed' else p.status end,
    confirmed_at = case when p.status = 'pending' then now() else p.confirmed_at end
from "user" u
where u.id = p.user_id and lower(trim(u.email)) = 'casinoworld@gmail.com';
