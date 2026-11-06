export type TransactionType = "expense" | "income";

export type Transaction = {
    type: TransactionType;
    amount: number;
    categoryId: string | null;
    categoryName: string | null;
    date: string;
    note: string | null;
    createdAt: string;
};

export type CategoryRef = { id: string; name: string; type: TransactionType };
