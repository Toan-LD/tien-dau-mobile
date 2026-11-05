import { fake } from '@/test-utils/supabase-mock';
import {
  createCategory, DuplicateCategoryError, listCategories, normalizeCategoryName,
} from '@/lib/categories';

jest.mock('@/lib/supabase', () => ({
  supabase: jest.requireActual('@/test-utils/supabase-mock').fakeSupabase,
}));

beforeEach(() => fake.reset());

describe('normalizeCategoryName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeCategoryName('  Cà   phê ')).toBe('Cà phê');
  });
});

describe('createCategory', () => {
  const input = { name: ' Cà   phê ', iconKey: 'cafe', type: 'expense' as const, sortOrder: 99 };

  it('inserts a normalized name with the user id and maps the row', () => {
    fake.enqueue('categories', {
      data: { id: 'c1', name: 'Cà phê', icon: 'cafe', type: 'expense', sort_order: 99 },
    });
    return createCategory(input).then((c) => {
      expect(fake.lastInsert).toMatchObject({
        name: 'Cà phê', icon: 'cafe', type: 'expense', sort_order: 99, user_id: 'user-1',
      });
      expect(c).toEqual({ id: 'c1', name: 'Cà phê', icon: 'cafe', type: 'expense', sortOrder: 99 });
    });
  });

  it('throws DuplicateCategoryError on unique violation', async () => {
    fake.enqueue('categories', { error: { code: '23505' } });
    await expect(createCategory({ ...input, name: 'Ăn uống' })).rejects.toBeInstanceOf(DuplicateCategoryError);
  });

  it('throws without a session', async () => {
    fake.userId = null;
    await expect(createCategory(input)).rejects.toThrow();
  });
});

describe('listCategories', () => {
  it('filters by type and maps rows', async () => {
    fake.enqueue('categories', {
      data: [{ id: 'c1', name: 'Lương', icon: null, type: 'income', sort_order: 1 }],
    });
    const list = await listCategories('income');
    expect(fake.callsTo('eq')).toContainEqual(['type', 'income']);
    expect(list).toEqual([{ id: 'c1', name: 'Lương', icon: null, type: 'income', sortOrder: 1 }]);
  });
});
