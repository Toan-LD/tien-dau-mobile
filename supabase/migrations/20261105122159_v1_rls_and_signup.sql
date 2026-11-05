-- RLS policies

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "wallets_select_own" on public.wallets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "wallets_insert_own" on public.wallets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "wallets_update_own" on public.wallets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "wallets_delete_own" on public.wallets
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "categories_select_own" on public.categories
  for select to authenticated using (user_id = (select auth.uid()));
create policy "categories_insert_own" on public.categories
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "categories_update_own" on public.categories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "categories_delete_own" on public.categories
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "budgets_select_own" on public.budgets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "budgets_insert_own" on public.budgets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "budgets_update_own" on public.budgets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "budgets_delete_own" on public.budgets
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "recurring_select_own" on public.recurring_transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "recurring_insert_own" on public.recurring_transactions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "recurring_update_own" on public.recurring_transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "recurring_delete_own" on public.recurring_transactions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "transactions_select_own" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.wallets w
      where w.id = wallet_id and w.user_id = (select auth.uid())
    )
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = category_id and c.user_id = (select auth.uid())
      )
    )
    and (
      to_wallet_id is null
      or exists (
        select 1 from public.wallets tw
        where tw.id = to_wallet_id and tw.user_id = (select auth.uid())
      )
    )
  );
create policy "transactions_update_own" on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.wallets w
      where w.id = wallet_id and w.user_id = (select auth.uid())
    )
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = category_id and c.user_id = (select auth.uid())
      )
    )
    and (
      to_wallet_id is null
      or exists (
        select 1 from public.wallets tw
        where tw.id = to_wallet_id and tw.user_id = (select auth.uid())
      )
    )
  );
create policy "transactions_delete_own" on public.transactions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Category defaults and uniqueness

alter table public.categories alter column icon set default 'ellipsis';

create unique index categories_user_type_name_key
  on public.categories (user_id, type, lower(btrim(name)));

-- New-user bootstrap (the on_auth_user_created trigger already exists)

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $function$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do nothing;

  if not exists (select 1 from public.wallets where user_id = new.id) then
    insert into public.wallets (user_id, name, type)
    values (new.id, 'Ví chính', 'cash');
  end if;

  if not exists (select 1 from public.categories where user_id = new.id) then
    insert into public.categories (user_id, name, type, icon, sort_order)
    select new.id, d.name, d.type::public.transaction_type, d.icon, d.ord
    from (values
      ('Ăn uống',      'expense', 'restaurant',    1),
      ('Cà phê',       'expense', 'cafe',          2),
      ('Đi lại',       'expense', 'car',           3),
      ('Mua sắm',      'expense', 'bag-handle',    4),
      ('Hoá đơn',      'expense', 'receipt',       5),
      ('Nhà cửa',      'expense', 'home',          6),
      ('Giải trí',     'expense', 'film',          7),
      ('Sức khoẻ',     'expense', 'medkit',        8),
      ('Gia đình',     'expense', 'people',        9),
      ('Học tập',      'expense', 'school',       10),
      ('Khác',         'expense', 'ellipsis',     11),
      ('Lương',        'income',  'wallet',        1),
      ('Thưởng',       'income',  'trophy',        2),
      ('Được cho/tặng','income',  'gift',          3),
      ('Khác',         'income',  'ellipsis',      4)
    ) as d(name, type, icon, ord);
  end if;

  return new;
end;
$function$;
