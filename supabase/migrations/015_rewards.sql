-- TrackMyProgress · recompensas por puntos
-- Ejecutar en el SQL editor de un proyecto que ya tenga el esquema base aplicado.

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  point_cost int not null check (point_cost > 0),
  created_at timestamptz not null default now()
);
create index if not exists rewards_user_id_idx on rewards (user_id);
alter table rewards enable row level security;

create policy "rewards_select_own" on rewards
  for select using (auth.uid() = user_id);
create policy "rewards_insert_own" on rewards
  for insert with check (auth.uid() = user_id);
create policy "rewards_delete_own" on rewards
  for delete using (auth.uid() = user_id);

create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reward_name text not null,
  points_spent int not null,
  redeemed_at timestamptz not null default now()
);
create index if not exists reward_redemptions_user_id_idx on reward_redemptions (user_id);
alter table reward_redemptions enable row level security;

create policy "reward_redemptions_select_own" on reward_redemptions
  for select using (auth.uid() = user_id);
create policy "reward_redemptions_insert_own" on reward_redemptions
  for insert with check (auth.uid() = user_id);
create policy "reward_redemptions_delete_own" on reward_redemptions
  for delete using (auth.uid() = user_id);
