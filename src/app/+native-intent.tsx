// The OAuth redirect (`<scheme>://auth/callback?code=...`) is consumed by WebBrowser.openAuthSessionAsync
// in src/lib/auth.tsx. Expo Router also receives it as a deep link, so send it to the root instead of
// an unmatched route; the Stack.Protected guards then show login or the tabs.
export function redirectSystemPath({
    path,
}: {
    path: string;
    initial: boolean;
}) {
    return path.includes("auth/callback") ? "/" : path;
}
