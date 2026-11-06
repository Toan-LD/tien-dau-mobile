begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.com', '{"full_name":"A"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@example.com', '{"full_name":"B"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
select throws_ok(
  $$select public.consume_chat_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1000)$$,
  '42501', null, 'authenticated cannot call consume_chat_quota');
reset role;

set local role anon;
select throws_ok(
  $$select public.consume_chat_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1000)$$,
  '42501', null, 'anon cannot call consume_chat_quota');
reset role;

set local role service_role;
select is(public.consume_chat_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3), 2, 'first call leaves 2');
select is(public.consume_chat_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3), 1, 'second call leaves 1');
select is(public.consume_chat_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3), 0, 'third call leaves 0');
select is(public.consume_chat_quota('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3), -1, 'fourth call is refused');
select is((select count from public.chat_usage where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 3, 'refused call does not increment');
select is(public.consume_chat_quota('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3), 2, 'B is independent of A');

delete from public.chat_usage where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
insert into public.chat_usage (user_id, day, count) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1, 3);
select is(public.consume_chat_quota('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3), 2, 'yesterday does not count today');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
select is((select count(*)::int from public.chat_usage), 0, 'authenticated cannot read counters');

select * from finish();
rollback;
