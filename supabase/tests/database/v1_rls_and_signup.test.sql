begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.com', '{"full_name":"A"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@example.com', '{"full_name":"B"}');

create temp table ids as
select
  (select id from public.wallets where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as wallet_a,
  (select id from public.wallets where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') as wallet_b,
  (select id from public.categories where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and type = 'expense' limit 1) as cat_a,
  (select id from public.categories where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and type = 'expense' limit 1) as cat_b;
grant select on ids to authenticated;

select is((select count(*)::int from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and full_name = 'A'), 1, 'profile created for A');
select is((select count(*)::int from public.wallets where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and name = 'Ví chính'), 1, 'default wallet created');
select is((select count(*)::int from public.categories where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and type = 'expense'), 11, '11 expense categories');
select is((select count(*)::int from public.categories where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and type = 'income'), 4, '4 income categories');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

select is((select count(*)::int from public.categories), 15, 'A sees only own categories');

select throws_ok(
  $$insert into public.transactions (user_id, wallet_id, type, amount)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', wallet_b, 'expense', 1000 from ids$$,
  '42501', null, 'cannot use another user''s wallet');
select throws_ok(
  $$insert into public.transactions (user_id, wallet_id, category_id, type, amount)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', wallet_a, cat_b, 'expense', 1000 from ids$$,
  '42501', null, 'cannot use another user''s category');
select lives_ok(
  $$insert into public.transactions (user_id, wallet_id, category_id, type, amount)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', wallet_a, cat_a, 'expense', 1000 from ids$$,
  'valid transaction is accepted');
select throws_ok(
  $$insert into public.transactions (user_id, wallet_id, to_wallet_id, type, amount)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', wallet_a, wallet_b, 'transfer', 1000 from ids$$,
  '42501', null, 'cannot transfer to another user''s wallet');
select throws_ok(
  $$insert into public.categories (user_id, name, type) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ' ăn uống ', 'expense')$$,
  '23505', null, 'duplicate category name differing by case and spaces is rejected');

select throws_ok(
  $$insert into public.recurring_transactions (user_id, wallet_id, type, amount, frequency, next_run_date)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', wallet_b, 'expense', 1000, 'monthly', current_date from ids$$,
  '42501', null, 'recurring cannot use another user''s wallet');
select throws_ok(
  $$insert into public.recurring_transactions (user_id, wallet_id, category_id, type, amount, frequency, next_run_date)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', wallet_a, cat_b, 'expense', 1000, 'monthly', current_date from ids$$,
  '42501', null, 'recurring cannot use another user''s category');
select throws_ok(
  $$insert into public.budgets (user_id, category_id, amount, month)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', cat_b, 1000, current_date from ids$$,
  '42501', null, 'budget cannot use another user''s category');
select throws_ok(
  $$insert into public.categories (user_id, name, type, parent_id)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Con', 'expense', cat_b from ids$$,
  '42501', null, 'category cannot have another user''s parent');
select throws_ok(
  $$update public.categories set parent_id = (select cat_b from ids)
    where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and name = 'Cà phê'$$,
  '42501', null, 'category update cannot set another user''s parent');

select * from finish();
rollback;
