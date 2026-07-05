-- Run this in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this in → Run).
-- A successful run shows "Success. No rows returned" because this script
-- creates schema objects but does not select or insert any data.
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

-- ---------------------------------------------------------------------------
-- Attachments (for the Batch 3 feature: task attachments)
--
-- 1. Create the storage bucket first via the Dashboard (this can't be done
--    from SQL): Storage → New bucket → name it exactly "attachments" →
--    leave "Public" turned OFF.
-- 2. Then run the policies below, which restrict each user to a folder
--    named after their own user id (files are uploaded to
--    "<user_id>/<task_id>/<filename>", enforced in the app code).

drop policy if exists "Users can upload their own attachments" on storage.objects;
drop policy if exists "Users can view their own attachments" on storage.objects;
drop policy if exists "Users can delete their own attachments" on storage.objects;

create policy "Users can upload their own attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own attachments"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own attachments"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
