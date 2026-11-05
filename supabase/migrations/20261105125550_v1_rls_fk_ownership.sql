-- Reject references to other users' rows (FK checks bypass RLS)

drop policy "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated
  with check (
    transactions.user_id = (select auth.uid())
    and exists (select 1 from public.wallets w where w.id = transactions.wallet_id and w.user_id = (select auth.uid()))
    and (transactions.category_id is null or exists (select 1 from public.categories c where c.id = transactions.category_id and c.user_id = (select auth.uid())))
    and (transactions.to_wallet_id is null or exists (select 1 from public.wallets tw where tw.id = transactions.to_wallet_id and tw.user_id = (select auth.uid())))
  );

drop policy "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update to authenticated
  using (transactions.user_id = (select auth.uid()))
  with check (
    transactions.user_id = (select auth.uid())
    and exists (select 1 from public.wallets w where w.id = transactions.wallet_id and w.user_id = (select auth.uid()))
    and (transactions.category_id is null or exists (select 1 from public.categories c where c.id = transactions.category_id and c.user_id = (select auth.uid())))
    and (transactions.to_wallet_id is null or exists (select 1 from public.wallets tw where tw.id = transactions.to_wallet_id and tw.user_id = (select auth.uid())))
  );

drop policy "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own" on public.budgets
  for insert to authenticated
  with check (
    budgets.user_id = (select auth.uid())
    and (budgets.category_id is null or exists (select 1 from public.categories c where c.id = budgets.category_id and c.user_id = (select auth.uid())))
  );

drop policy "budgets_update_own" on public.budgets;
create policy "budgets_update_own" on public.budgets
  for update to authenticated
  using (budgets.user_id = (select auth.uid()))
  with check (
    budgets.user_id = (select auth.uid())
    and (budgets.category_id is null or exists (select 1 from public.categories c where c.id = budgets.category_id and c.user_id = (select auth.uid())))
  );

drop policy "recurring_insert_own" on public.recurring_transactions;
create policy "recurring_insert_own" on public.recurring_transactions
  for insert to authenticated
  with check (
    recurring_transactions.user_id = (select auth.uid())
    and exists (select 1 from public.wallets w where w.id = recurring_transactions.wallet_id and w.user_id = (select auth.uid()))
    and (recurring_transactions.category_id is null or exists (select 1 from public.categories c where c.id = recurring_transactions.category_id and c.user_id = (select auth.uid())))
  );

drop policy "recurring_update_own" on public.recurring_transactions;
create policy "recurring_update_own" on public.recurring_transactions
  for update to authenticated
  using (recurring_transactions.user_id = (select auth.uid()))
  with check (
    recurring_transactions.user_id = (select auth.uid())
    and exists (select 1 from public.wallets w where w.id = recurring_transactions.wallet_id and w.user_id = (select auth.uid()))
    and (recurring_transactions.category_id is null or exists (select 1 from public.categories c where c.id = recurring_transactions.category_id and c.user_id = (select auth.uid())))
  );

-- A policy on categories cannot query categories itself (infinite recursion),
-- so the parent check goes through a security definer helper.
create function public.is_own_category(category uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1 from public.categories c
    where c.id = category and c.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_own_category(uuid) from public, anon;
grant execute on function public.is_own_category(uuid) to authenticated;

drop policy "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories
  for insert to authenticated
  with check (
    categories.user_id = (select auth.uid())
    and (categories.parent_id is null or public.is_own_category(categories.parent_id))
  );

drop policy "categories_update_own" on public.categories;
create policy "categories_update_own" on public.categories
  for update to authenticated
  using (categories.user_id = (select auth.uid()))
  with check (
    categories.user_id = (select auth.uid())
    and (categories.parent_id is null or public.is_own_category(categories.parent_id))
  );
