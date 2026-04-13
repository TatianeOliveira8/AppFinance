import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { formatCurrency } from '../utils/helpers';

interface SummaryCardProps {
    balance: number;
    income: number;
    expense: number;
    pendingIncome?: number;
    pendingExpense?: number;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
    balance,
    income,
    expense,
    pendingIncome = 0,
    pendingExpense = 0
}) => {
    return (
        <View style={styles.summaryCard}>
            <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>Valor disponível</Text>
                <Text style={[styles.balanceValue, { color: balance < 0 ? '#F44336' : '#FF8C00' }]}>
                    {formatCurrency(balance)}
                </Text>
                {(pendingIncome > 0 || pendingExpense > 0) && (
                    <View style={styles.pendingRow}>
                        <Text style={styles.pendingLabel}>Pendentes: </Text>
                        <Text style={styles.pendingValue}>
                            {pendingIncome > 0 ? `+${formatCurrency(pendingIncome)} ` : ''}
                            {pendingExpense > 0 ? `-${formatCurrency(pendingExpense)}` : ''}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.divider} />

            <View style={styles.incomeExpenseRow}>
                <View style={[styles.statBox, styles.incomeBg]}>
                    <Text style={styles.statLabel}>Total Receitas</Text>
                    <Text style={styles.incomeText}>{formatCurrency(income)}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Gastos</Text>
                    <Text style={styles.expenseText}>{formatCurrency(expense)}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    summaryCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 24,
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        alignSelf: 'center',
        width: '90%',
        maxWidth: 600,
        marginTop: 20,
    },
    balanceContainer: { marginBottom: 20, alignItems: 'center' },
    balanceLabel: { fontSize: 13, color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    balanceValue: { fontSize: 44, fontWeight: '900', marginVertical: 4 },
    pendingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    pendingLabel: { fontSize: 12, color: '#AAA', fontWeight: '500' },
    pendingValue: { fontSize: 12, color: '#777', fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#F8F8F8', marginBottom: 20 },
    incomeExpenseRow: { flexDirection: 'row', gap: 12 },
    statBox: {
        flex: 1,
        padding: 14,
        borderRadius: 18,
        backgroundColor: '#F9F9F9',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F0F0F0'
    },
    incomeBg: {
        backgroundColor: '#FFF9F1',
    },
    statLabel: { fontSize: 11, color: '#999', fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase' },
    incomeText: { fontSize: 16, fontWeight: '800', color: '#FF8C00' },
    expenseText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
});
