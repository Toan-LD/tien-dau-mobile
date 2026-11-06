import {
    createContext,
    useContext,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useState,
} from "react";
import { StyleSheet, View } from "react-native";

type PortalApi = {
    set(id: string, node: React.ReactNode): void;
    remove(id: string): void;
};

const PortalContext = createContext<PortalApi | null>(null);

export function PortalHost({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const [nodes, setNodes] = useState<[string, React.ReactNode][]>([]);

    const api = useMemo<PortalApi>(
        () => ({
            set: (id, node) =>
                setNodes((list) => {
                    const i = list.findIndex(([key]) => key === id);
                    if (i === -1) return [...list, [id, node]];
                    const next = list.slice();
                    next[i] = [id, node];
                    return next;
                }),
            remove: (id) =>
                setNodes((list) => list.filter(([key]) => key !== id)),
        }),
        [],
    );

    return (
        <PortalContext.Provider value={api}>
            {children}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {nodes.map(([id, node]) => (
                    <View
                        key={id}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="box-none"
                    >
                        {node}
                    </View>
                ))}
            </View>
        </PortalContext.Provider>
    );
}

export function Portal({ children }: Readonly<{ children: React.ReactNode }>) {
    const api = useContext(PortalContext);
    if (!api) throw new Error("Portal must be inside PortalHost");
    const id = useId();

    useLayoutEffect(() => {
        api.set(id, children);
    }, [api, id, children]);

    useEffect(() => () => api.remove(id), [api, id]);

    return null;
}
