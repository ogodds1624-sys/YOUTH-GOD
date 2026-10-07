create table pricing_settings (
  id text primary key check (id = 'main'),
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

insert into pricing_settings (id, settings) values ('main', '{
  "Ghana": {
    "activationFee": 45,
    "packages": [
      {"id": "quick", "price": 350, "minutes": 3},
      {"id": "popular", "price": 800, "minutes": 10},
      {"id": "extended", "price": 1700, "minutes": 15}
    ]
  },
  "Nigeria": {
    "activationFee": 6000,
    "packages": [
      {"id": "quick", "price": 41986, "minutes": 3},
      {"id": "popular", "price": 95968, "minutes": 10},
      {"id": "extended", "price": 203932, "minutes": 15}
    ]
  }
}');

alter table payments add column package_id text;
alter table payments add column session_minutes integer check (session_minutes between 1 and 1440);
alter table payments add column country text check (country in ('Ghana', 'Nigeria'));

update payments set session_minutes = case
  when amount in (1700, 203932) then 15
  when amount in (800, 95968) then 10
  when amount in (500, 75000) then 7
  when amount in (400, 55000) then 5
  else 3
end where purpose = 'session';

update payments set country = case
  when amount in (6000, 7000, 41986, 95968, 203932, 35000, 55000, 75000) then 'Nigeria'
  else 'Ghana'
end;
