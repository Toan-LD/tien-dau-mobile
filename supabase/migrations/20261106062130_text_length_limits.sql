alter table public.categories
  add constraint categories_name_length check (char_length(name) <= 40);

alter table public.transactions
  add constraint transactions_note_length check (char_length(note) <= 200);

alter table public.recurring_transactions
  add constraint recurring_transactions_note_length check (char_length(note) <= 200);
