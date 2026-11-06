export type TxType = "expense" | "income";

export type Tx = {
    type: TxType;
    amount: number;
    categoryId: string | null;
    categoryName: string | null;
    date: string;
    note: string | null;
    createdAt: string;
};

export type CategoryRef = { id: string; name: string; type: TxType };
