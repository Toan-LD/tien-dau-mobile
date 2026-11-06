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
    const difference = after - before;
    if (difference === 0) return "không đổi";
    const amount = formatVND(Math.abs(difference));
    if (before === 0) {
        return difference > 0
            ? `tăng ${amount} (kỳ trước không có)`
            : `giảm ${amount} (kỳ trước không có)`;
    }
    const percent = Math.round((difference / before) * 100);
    return difference > 0
        ? `tăng ${amount} (+${percent}%)`
        : `giảm ${amount} (${percent}%)`;
}
