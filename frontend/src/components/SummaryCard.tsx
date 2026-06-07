import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';

interface SummaryCardProps {
    balance: number;
    income: number;
    expense: number;
    pendingIncome?: number;
    pendingExpense?: number;
    incomePendingList?: any[];
    expensePendingList?: any[];
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
    balance,
    income,
    expense,
    pendingIncome = 0,
    pendingExpense = 0,
    incomePendingList = [],
    expensePendingList = []
}) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.balanceContainer}>
                <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Em conta agora</Text>
                <Text style={[styles.balanceValue, { color: balance < 0 ? colors.danger : colors.accent }]}>
                    {formatCurrency(balance)}
                </Text>
            </View>

            <View style={styles.summaryGrid}>
                <View style={styles.summarySection}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Entradas</Text>
                    <View style={styles.valueRow}>
                        <Text style={[styles.mainValue, { color: colors.accent }]}>{formatCurrency(income)}</Text>
                        <Text style={[styles.labelSmall, { color: colors.textMuted }]}>Recebido</Text>
                    </View>
                    {pendingIncome > 0 && (
                        <View style={[styles.pendingContainer, { backgroundColor: colors.surfaceVariant }]}>
                            <Text style={[styles.pendingTitle, { color: colors.accent }]}>Previsto (+{formatCurrency(pendingIncome)})</Text>
                            {incomePendingList.slice(0, 2).map((item, idx) => (
                                <Text key={idx} style={[styles.pendingItem, { color: colors.textMuted }]} numberOfLines={1}>
                                    • {item.description?.replace(/^(Receita|Gasto)\s*/i, '').trim() || item.description}
                                </Text>
                            ))}
                        </View>
                    )}
                </View>

                <View style={[styles.summarySection, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Saídas</Text>
                    <View style={styles.valueRow}>
                        <Text style={[styles.mainValue, { color: colors.text }]}>{formatCurrency(expense)}</Text>
                        <Text style={[styles.labelSmall, { color: colors.textMuted }]}>Pago</Text>
                    </View>
                    {pendingExpense > 0 && (
                        <View style={[styles.pendingContainer, { backgroundColor: colors.surfaceVariant }]}>
                            <Text style={[styles.pendingTitle, { color: colors.danger }]}>A pagar (-{formatCurrency(pendingExpense)})</Text>
                            {expensePendingList.slice(0, 2).map((item, idx) => (
                                <Text key={idx} style={[styles.pendingItem, { color: colors.textMuted }]} numberOfLines={1}>
                                    • {item.description?.replace(/^(Receita|Gasto)\s*/i, '').trim() || item.description}
                                </Text>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    summaryCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        padding: 24,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 6,
        marginTop: 20,
    },
    balanceContainer: { marginBottom: 24, alignItems: 'center' },
    balanceLabel: { fontSize: 13, color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    balanceValue: { fontSize: 44, fontWeight: '900', marginVertical: 4 },
    summaryGrid: { flexDirection: 'row', marginTop: 10 },
    summarySection: { flex: 1, paddingHorizontal: 12 },
    sectionTitle: { fontSize: 11, color: '#AAA', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
    valueRow: { marginBottom: 12 },
    mainValue: { fontSize: 18, fontWeight: '800', color: '#FF8C00' },
    labelSmall: { fontSize: 10, color: '#BBB', fontWeight: '600' },
    pendingContainer: { marginTop: 4, padding: 8, backgroundColor: '#F9F9F9', borderRadius: 12 },
    pendingTitle: { fontSize: 10, color: '#FF8C00', fontWeight: '800', marginBottom: 4 },
    pendingItem: { fontSize: 9, color: '#999', fontWeight: '500' },
});
