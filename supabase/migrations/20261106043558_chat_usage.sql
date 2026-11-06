-- Daily per-user chatbot question counter. Only service_role (Edge Function) touches it.
create table public.chat_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count int not null,
  primary key (user_id, day)
);

alter table public.chat_usage enable row level security;

-- Returns remaining questions today (p_limit - count), or -1 when the limit is reached.
-- Single insert-or-update statement so concurrent calls never over-count.
create function public.consume_chat_quota(p_user_id uuid, p_limit int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  insert into public.chat_usage as usage_row (user_id, day, count)
  values (p_user_id, (now() at time zone 'Asia/Ho_Chi_Minh')::date, 1)
  on conflict (user_id, day) do update set count = usage_row.count + 1
    where usage_row.count < p_limit
  returning usage_row.count into v_count;

  if v_count is null then
    return -1;
  end if;
  return p_limit - v_count;
end;
$$;

revoke execute on function public.consume_chat_quota(uuid, int) from public, anon, authenticated;
grant execute on function public.consume_chat_quota(uuid, int) to service_role;
