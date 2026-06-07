import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';

interface CategoryBarProps {
    name: string;
    value: number;
    percentage: number;
    icon?: string;
    color?: string;
    categoryId?: number;
    isDefault?: boolean;
    budgetLimit?: number;
    anomalyAlert?: {
        severity: 'warning' | 'critical';
        increase_pct: number;
        avg_last_3_months: number;
    } | null;
    onPress?: (categoryId: number, categoryName: string, isDefault?: boolean) => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
    name,
    value,
    percentage,
    icon,
    color,
    categoryId,
    isDefault,
    budgetLimit,
    anomalyAlert,
    onPress
}) => {
    const themeColor = color || '#FF8C00';
    const { colors, isDark } = useTheme();

    const getCategoryIcon = (name: string, savedIcon?: string): any => {
        if (savedIcon) return savedIcon;
        const n = name.toLowerCase();
        if (n.includes('moradia')) return 'home-city';
        if (n.includes('alimentação')) return 'food';
        if (n.includes('transporte')) return 'car-back';
        if (n.includes('saúde')) return 'heart-pulse';
        if (n.includes('lazer')) return 'controller-classic';
        if (n.includes('salário')) return 'bank-transfer-in';
        if (n.includes('renda extra')) return 'gift';
        if (n.includes('empréstimo')) return 'bank';
        return 'tag';
    };

    const displayPercentage = budgetLimit && budgetLimit > 0 
        ? (value / budgetLimit) * 100 
        : (anomalyAlert && anomalyAlert.avg_last_3_months > 0 
            ? (value / anomalyAlert.avg_last_3_months) * 100 
            : percentage);

    const isExceeded = (budgetLimit && value > budgetLimit) || (anomalyAlert?.severity === 'critical');
    const isNearLimit = (budgetLimit && !isExceeded && displayPercentage >= 80) || (anomalyAlert?.severity === 'warning');

    let barColor = themeColor;
    if (isExceeded) {
        barColor = '#EF5350'; // Red
    } else if (isNearLimit) {
        barColor = '#FFC107'; // Yellow/Amber
    }

    let limitTextColor = colors.textMuted;
    if (isExceeded) {
        limitTextColor = '#EF5350'; // Red
    } else if (isNearLimit) {
        limitTextColor = '#FFC107'; // Yellow
    }

    const limitLabel = budgetLimit 
        ? `Limite: ${formatCurrency(budgetLimit)}` 
        : (anomalyAlert ? `Média: ${formatCurrency(anomalyAlert.avg_last_3_months)}` : '');

    return (
        <TouchableOpacity
            onPress={() => categoryId && onPress && onPress(categoryId, name, isDefault)}
            activeOpacity={0.7}
        >
            <View style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                    <View style={styles.nameRow}>
                        <View style={[styles.iconBox, { backgroundColor: themeColor + '15' }]}>
                            <Icon name={getCategoryIcon(name, icon)} size={18} color={themeColor} />
                        </View>
                        <Text style={[styles.categoryName, { color: colors.text }]}>{name}</Text>
                    </View>
                    <Text style={[styles.categoryValue, { color: colors.text }]}>{formatCurrency(value)}</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { 
                                width: `${Math.min(displayPercentage, 100)}%`, 
                                backgroundColor: barColor 
                            }
                        ]}
                    />
                </View>
                {(budgetLimit || anomalyAlert) ? (
                    <View style={styles.limitInfo}>
                        <Text style={[styles.limitText, { color: limitTextColor }]}>
                            {limitLabel}
                        </Text>
                        <Text style={[styles.limitText, { color: limitTextColor }]}>
                            {displayPercentage.toFixed(0)}%
                        </Text>
                    </View>
                ) : null}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    categoryItem: { marginBottom: 20 },
    categoryInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    categoryValue: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A' },
    progressBarBg: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: 8, borderRadius: 4 },
    limitInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    limitText: { fontSize: 10, fontWeight: '600' },
    anomalyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        marginTop: 6,
        alignSelf: 'flex-start'
    },
    anomalyText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
});
