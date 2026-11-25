-- Схема для «Гаража»: одна запись на пользователя, доступ только владельцу
-- Выполните этот скрипт в Supabase → SQL Editor → New query → Run

-- Таблица с данными аккаунта
create table if not exists public.garage_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Индекс на случай будущих выборок по времени
create index if not exists garage_data_updated_at_idx on public.garage_data (updated_at desc);

-- Защита: включаем Row Level Security
alter table public.garage_data enable row level security;

-- Каждый видит и меняет только свою запись
drop policy if exists "garage read own" on public.garage_data;
create policy "garage read own"
  on public.garage_data
  for select
  using (auth.uid() = user_id);

drop policy if exists "garage insert own" on public.garage_data;
create policy "garage insert own"
  on public.garage_data
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "garage update own" on public.garage_data;
create policy "garage update own"
  on public.garage_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "garage delete own" on public.garage_data;
create policy "garage delete own"
  on public.garage_data
  for delete
  using (auth.uid() = user_id);

-- Автообновление времени изменения
create or replace function public.garage_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists garage_data_touch on public.garage_data;
create trigger garage_data_touch
  before update on public.garage_data
  for each row
  execute function public.garage_touch_updated_at();