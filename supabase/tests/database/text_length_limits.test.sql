begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.com', '{"full_name":"A"}');

create temp table ids as
select
  (select id from public.wallets where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as wallet_a,
  (select id from public.categories where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and type = 'expense' limit 1) as cat_a;

select lives_ok(
  $$insert into public.categories (user_id, name, type) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('a', 40), 'expense')$$,
  'category name of 40 characters is accepted');
select throws_ok(
  $$insert into public.categories (user_id, name, type) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', repeat('b', 41), 'expense')$$,
  '23514', null, 'category name of 41 characters is rejected');

select lives_ok(
  $$insert into public.transactions (user_id, wallet_id, category_id, type, amount, note)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', wallet_a, cat_a, 'expense', 1000, repeat('n', 200) from ids$$,
  'note of 200 characters is accepted');
select throws_ok(
  $$insert into public.transactions (user_id, wallet_id, category_id, type, amount, note)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', wallet_a, cat_a, 'expense', 1000, repeat('n', 201) from ids$$,
  '23514', null, 'note of 201 characters is rejected');
select lives_ok(
  $$insert into public.transactions (user_id, wallet_id, category_id, type, amount, note)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', wallet_a, cat_a, 'expense', 1000, null from ids$$,
  'empty note is still accepted');

select throws_ok(
  $$insert into public.recurring_transactions (user_id, wallet_id, category_id, type, amount, frequency, next_run_date, note)
    select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', wallet_a, cat_a, 'expense', 1000, 'monthly', current_date, repeat('n', 201) from ids$$,
  '23514', null, 'recurring note of 201 characters is rejected');

select * from finish();
rollback;
