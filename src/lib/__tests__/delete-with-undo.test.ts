import { deleteWithUndo } from '@/lib/delete-with-undo';
import { deleteTransaction, restoreTransaction, type Transaction } from '@/lib/transactions';

jest.mock('@/lib/transactions', () => ({
  deleteTransaction: jest.fn(),
  restoreTransaction: jest.fn(),
}));

const tx: Transaction = {
  id: 'tx-1', type: 'expense', amount: 35000, categoryId: 'c1',
  category: { id: 'c1', name: 'Ăn uống', icon: 'restaurant' },
  note: 'phở', date: '2026-11-04', createdAt: '2026-11-04T03:00:00.000Z', walletId: 'w1',
};

const mockDelete = deleteTransaction as jest.Mock;
const mockRestore = restoreTransaction as jest.Mock;

beforeEach(() => {
  mockDelete.mockReset().mockResolvedValue(undefined);
  mockRestore.mockReset().mockResolvedValue(undefined);
});

it('deletes, notifies, shows an undo toast', async () => {
  const toast = { show: jest.fn() };
  const onChanged = jest.fn();
  await deleteWithUndo(tx, toast, onChanged);
  expect(mockDelete).toHaveBeenCalledWith('tx-1');
  expect(onChanged).toHaveBeenCalledTimes(1);
  expect(toast.show).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'Đã xoá "phở"', actionLabel: 'Hoàn tác', durationMs: 5000 }),
  );
});

it('falls back to category name, then "Không phân loại"', async () => {
  const toast = { show: jest.fn() };
  await deleteWithUndo({ ...tx, note: null }, toast, jest.fn());
  expect(toast.show.mock.calls[0][0].message).toBe('Đã xoá "Ăn uống"');
  await deleteWithUndo({ ...tx, note: null, category: null }, toast, jest.fn());
  expect(toast.show.mock.calls[1][0].message).toBe('Đã xoá "Không phân loại"');
});

it('restores exactly once even if the action fires twice', async () => {
  const toast = { show: jest.fn() };
  const onChanged = jest.fn();
  await deleteWithUndo(tx, toast, onChanged);
  const { onAction } = toast.show.mock.calls[0][0];
  onAction();
  onAction();
  await Promise.resolve();
  expect(mockRestore).toHaveBeenCalledTimes(1);
  expect(mockRestore).toHaveBeenCalledWith(tx);
  expect(onChanged).toHaveBeenCalledTimes(2);
});

it('toasts when undo fails', async () => {
  mockRestore.mockRejectedValue(new Error('x'));
  const toast = { show: jest.fn() };
  const onChanged = jest.fn();
  await deleteWithUndo(tx, toast, onChanged);
  toast.show.mock.calls[0][0].onAction();
  await new Promise<void>((r) => setImmediate(r));
  expect(toast.show).toHaveBeenLastCalledWith({ message: 'Không hoàn tác được' });
  expect(onChanged).toHaveBeenCalledTimes(1);
});

it('toasts and skips onChanged when delete fails', async () => {
  mockDelete.mockRejectedValue(new Error('x'));
  const toast = { show: jest.fn() };
  const onChanged = jest.fn();
  await deleteWithUndo(tx, toast, onChanged);
  expect(toast.show).toHaveBeenCalledWith({ message: 'Không xoá được' });
  expect(onChanged).not.toHaveBeenCalled();
});
