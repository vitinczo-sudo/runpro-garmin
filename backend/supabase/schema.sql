-- Run in Supabase SQL Editor
-- Creates isolated, per-user app state storage for RunPro Coach.

create extension if not exists pgcrypto;

create table if not exists public.user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_states enable row level security;

create policy "user_states_select_own"
on public.user_states
for select
using (auth.uid() = user_id);

create policy "user_states_insert_own"
on public.user_states
for insert
with check (auth.uid() = user_id);

create policy "user_states_update_own"
on public.user_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
