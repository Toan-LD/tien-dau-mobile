type Result = { data: unknown; error: { code?: string; message?: string } | null };

type Call = { method: string; args: unknown[] };

export const fake = {
  userId: 'user-1' as string | null,
  queue: {} as Record<string, Result[]>,
  fallback: { data: null, error: null } as Result,
  calls: [] as Call[],
  lastInsert: undefined as unknown,
  lastUpdate: undefined as unknown,
  reset() {
    this.userId = 'user-1';
    this.queue = {};
    this.fallback = { data: null, error: null };
    this.calls = [];
    this.lastInsert = undefined;
    this.lastUpdate = undefined;
  },
  enqueue(table: string, result: Partial<Result>) {
    (this.queue[table] ??= []).push({ data: null, error: null, ...result });
  },
  callsTo(method: string) {
    return this.calls.filter((c) => c.method === method).map((c) => c.args);
  },
};

function builder(table: string) {
  const b: Record<string, unknown> = {};
  const record = (method: string, args: unknown[]) => {
    fake.calls.push({ method, args });
    if (method === 'insert') fake.lastInsert = args[0];
    if (method === 'update') fake.lastUpdate = args[0];
    return b;
  };
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'gte', 'lte', 'order', 'limit']) {
    b[m] = (...args: unknown[]) => record(m, args);
  }
  const settle = () => fake.queue[table]?.shift() ?? fake.fallback;
  b.single = () => Promise.resolve(settle());
  b.maybeSingle = () => Promise.resolve(settle());
  b.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(settle()).then(resolve, reject);
  return b;
}

export const fakeSupabase = {
  from: (table: string) => {
    fake.calls.push({ method: 'from', args: [table] });
    return builder(table);
  },
  auth: {
    getSession: () =>
      Promise.resolve({
        data: { session: fake.userId ? { user: { id: fake.userId } } : null },
        error: null,
      }),
  },
};
