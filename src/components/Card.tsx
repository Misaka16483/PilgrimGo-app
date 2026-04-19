import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Colors, BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface CardProps {
    title?: string;
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'default' | 'outline' | 'flat';
}

export function Card({
                         title,
                         children,
                         style,
                         variant = 'default',
                     }: CardProps) {
    return (
        <View style={[styles.base, styles[variant], style]}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },

    default: {
        backgroundColor: Colors.card,
    },

    outline: {
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    flat: {
        backgroundColor: Colors.surface,
    },

    title: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
});
