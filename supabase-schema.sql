-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this in → Run).
--
-- It creates a single table that stores your whole planner as one JSON
-- blob per account, and locks it down so a user can only ever read or
-- write their own row.

create table if not exists app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

-- Make this setup script safe to re-run after a partial or previous install.
drop policy if exists "Users can view their own state" on app_state;
drop policy if exists "Users can insert their own state" on app_state;
drop policy if exists "Users can update their own state" on app_state;

create policy "Users can view their own state"
  on app_state for select
  using (auth.uid() = user_id);

create policy "Users can insert their own state"
  on app_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own state"
  on app_state for update
  using (auth.uid() = user_id);
