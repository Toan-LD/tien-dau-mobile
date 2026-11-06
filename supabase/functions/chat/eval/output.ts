type SyncWriter = { writeSync(bytes: Uint8Array): number };

const encoder = new TextEncoder();

export function printLine(
    text: string,
    output: SyncWriter = Deno.stdout,
): void {
    let remaining = encoder.encode(`${text}\n`);
    while (remaining.length > 0) {
        remaining = remaining.subarray(output.writeSync(remaining));
    }
}
