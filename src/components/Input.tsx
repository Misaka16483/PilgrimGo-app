import React from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    type ViewStyle,
    type TextStyle,
    type TextInputProps,
} from 'react-native';
import { Colors, BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
}

export function Input({
                          label,
                          error,
                          containerStyle,
                          inputStyle,
                          ...rest
                      }: InputProps) {
    return (
        <View style={[styles.wrapper, containerStyle]}>
            {label ? <Text style={styles.label}>{label}</Text> : null}

            <View style={[styles.inputBox, !!error && styles.errorBorder]}>
                <TextInput
                    style={[styles.input, inputStyle]}
                    placeholderTextColor={Colors.textLight}
                    {...rest}
                />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: Spacing.md,
    },

    label: {
        marginBottom: Spacing.xs,
        fontSize: FontSize.sm,
        color: Colors.text,
        fontWeight: '500',
    },

    inputBox: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.card,
    },

    input: {
        fontSize: FontSize.md,
        color: Colors.text,
    },

    errorBorder: {
        borderColor: Colors.error,
    },

    errorText: {
        marginTop: Spacing.xs,
        fontSize: FontSize.sm,
        color: Colors.error,
    },
});