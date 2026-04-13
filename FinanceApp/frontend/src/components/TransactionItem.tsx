import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import {
    formatCurrency,
    formatDate,
    getTransactionTypeColor
} from '../utils/helpers';

interface TransactionItemProps {
    type: 'income' | 'expense';
    value: number;
    description: string;
    date: string;
    is_paid?: boolean;
    categoryName?: string;
    categoryIcon?: string;
    categoryColor?: string;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
    type,
    value,
    description,
    date,
    is_paid = true,
    categoryName = '',
    categoryIcon,
    categoryColor
}) => {
    const isIncome = type === 'income';
    const baseColor = getTransactionTypeColor(type);
    const themeColor = categoryColor || baseColor;

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

    return (
        <View style={styles.itemCard}>
            <View style={[styles.iconBox, { backgroundColor: themeColor + '15' }]}>
                <Icon name={getCategoryIcon(categoryName, categoryIcon)} size={26} color={themeColor} />
            </View>

            <View style={styles.itemDetails}>
                <View style={styles.titleRow}>
                    <Text style={styles.itemDescription} numberOfLines={1}>
                        {description}
                    </Text>
                    {!is_paid && (
                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingText}>PENDENTE</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.itemDate}>{formatDate(date)}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.itemValue, { color: themeColor }]}>
                    {isIncome ? '+' : '-'} {formatCurrency(value)}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FFF'
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    itemDetails: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemDescription: { fontSize: 16, fontWeight: 'bold', color: '#333', flexShrink: 1 },
    pendingBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: '#FFB74D'
    },
    pendingText: { color: '#F57C00', fontSize: 9, fontWeight: 'bold' },
    itemDate: { fontSize: 12, color: '#999', marginTop: 2 },
    itemValue: { fontSize: 16, fontWeight: '700' },
});
