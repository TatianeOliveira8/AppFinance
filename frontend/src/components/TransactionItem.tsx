import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import {
    formatCurrency,
    formatDate,
    getTransactionTypeColor
} from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';

interface TransactionItemProps {
    type: 'income' | 'expense';
    value: number;
    description: string;
    date: string;
    is_paid?: boolean;
    categoryName?: string;
    categoryIcon?: string;
    categoryColor?: string;
    paymentMethod?: string | null;
    receiptPhoto?: string | null;
    contactName?: string | null;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
    type,
    value,
    description,
    date,
    is_paid = true,
    categoryName = '',
    categoryIcon,
    categoryColor,
    paymentMethod,
    receiptPhoto,
    contactName
}) => {
    const isIncome = type === 'income';
    const baseColor = getTransactionTypeColor(type);
    const themeColor = categoryColor || baseColor;
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

    const displayDescription = description && description.trim() !== '' ? description : (categoryName || (type === 'income' ? 'Receita' : 'Despesa'));

    return (
        <View style={[styles.itemCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={[styles.iconBox, { backgroundColor: themeColor + '15' }]}>
                <Icon name={getCategoryIcon(categoryName, categoryIcon)} size={26} color={themeColor} />
            </View>

            <View style={styles.itemDetails}>
                <View style={styles.titleRow}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                        {categoryName || (type === 'income' ? 'Receita' : 'Despesa')}
                    </Text>
                    {is_paid === false && (
                        <View style={[styles.pendingBadge, { backgroundColor: isDark ? colors.accentLight : '#FFF3E0', borderColor: isDark ? colors.accent + '40' : '#FFB74D' }]}>
                            <Text style={[styles.pendingText, { color: isDark ? colors.accent : '#F57C00' }]}>PENDENTE</Text>
                        </View>
                    )}
                </View>
                {description && description.trim() !== '' && (
                    <Text style={[styles.itemDescriptionText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {description}
                    </Text>
                )}
                <Text style={[styles.itemDate, { color: colors.textMuted }]}>{formatDate(date)}</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {paymentMethod && (
                        <View style={[styles.paymentBadge, { backgroundColor: colors.surfaceVariant }]}>
                            <Icon
                                name={paymentMethod === 'dinheiro' ? 'cash' : paymentMethod === 'credito' ? 'credit-card' : 'credit-card-outline'}
                                size={10}
                                color={colors.textMuted}
                            />
                            <Text style={[styles.paymentBadgeText, { color: colors.textSecondary }]}>
                                {paymentMethod === 'dinheiro' ? 'Dinheiro' : paymentMethod === 'credito' ? 'Crédito' : 'Débito'}
                            </Text>
                        </View>
                    )}
                    {contactName && (
                        <View style={[styles.paymentBadge, { backgroundColor: colors.surfaceVariant }]}>
                            <Icon name="account" size={10} color={colors.textMuted} />
                            <Text style={[styles.paymentBadgeText, { color: colors.textSecondary }]}>
                                {contactName}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.itemValue, { color: baseColor }]}>
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
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
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
    itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flexShrink: 1 },
    itemDescriptionText: { fontSize: 14, color: '#666', marginTop: 1, flexShrink: 1 },
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
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    paymentBadgeText: { fontSize: 10, color: '#888', fontWeight: '600' },
});
