import {
    KeyboardAvoidingView,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/theme";

type Props = {
    visible: boolean;
    onClose(): void;
    title: string;
    children: React.ReactNode;
};

export function BottomSheet({ visible, onClose, title, children }: Props) {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
            navigationBarTranslucent
        >
            <KeyboardAvoidingView behavior="padding" style={styles.root}>
                <Pressable
                    style={[StyleSheet.absoluteFill, styles.backdrop]}
                    onPress={onClose}
                />
                <View
                    style={[
                        styles.sheet,
                        { paddingBottom: insets.bottom + Spacing.three },
                    ]}
                >
                    <View style={styles.handle} />
                    <Text style={styles.title}>{title}</Text>
                    {children}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    backdrop: { backgroundColor: Colors.backdrop },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingTop: 10,
        paddingHorizontal: Spacing.three,
    },
    handle: {
        alignSelf: "center",
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        marginBottom: Spacing.three,
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 10,
    },
});
