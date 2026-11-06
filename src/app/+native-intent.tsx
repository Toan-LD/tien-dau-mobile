export function redirectSystemPath({
    path,
}: {
    path: string;
    initial: boolean;
}) {
    return path.includes("auth/callback") ? "/" : path;
}
