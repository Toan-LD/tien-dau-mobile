import { assertEquals } from "@std/assert";
import { printLine } from "./output.ts";

function chunkedWriter(chunkSize: number) {
    const written: number[] = [];
    return {
        written,
        writeSync(bytes: Uint8Array): number {
            const count = Math.min(chunkSize, bytes.length);
            written.push(...bytes.subarray(0, count));
            return count;
        },
    };
}

Deno.test(
    "printLine ghi đủ dòng kèm xuống dòng dù mỗi lần chỉ ghi được ít byte",
    () => {
        const writer = chunkedWriter(3);
        printLine("Lần chạy 1/2: đạt", writer);
        assertEquals(
            new TextDecoder().decode(new Uint8Array(writer.written)),
            "Lần chạy 1/2: đạt\n",
        );
    },
);

Deno.test("printLine không có nội dung thì in một dòng trống", () => {
    const writer = chunkedWriter(64);
    printLine("", writer);
    assertEquals(writer.written, [10]);
});
