function groupThousands(whole: number): string {
    return String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatVND(amount: number): string {
    const whole = Math.trunc(amount);
    return `${whole < 0 ? "-" : ""}${groupThousands(whole)} đ`;
}

export function toVND(raw: number | string): number {
    return Math.round(Number(raw));
}

export function formatShare(part: number, whole: number): string {
    if (whole === 0) return "0%";
    return `${Math.round((part / whole) * 100)}%`;
}

export function formatChange(before: number, after: number): string {
    const diff = after - before;
    if (diff === 0) return "không đổi";
    const amount = formatVND(Math.abs(diff));
    if (before === 0) {
        return diff > 0
            ? `tăng ${amount} (kỳ trước không có)`
            : `giảm ${amount} (kỳ trước không có)`;
    }
    const pct = Math.round((diff / before) * 100);
    return diff > 0 ? `tăng ${amount} (+${pct}%)` : `giảm ${amount} (${pct}%)`;
}
