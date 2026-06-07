import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { TransactionSummary } from '../services/transactionService';

interface FinancialTipsCardProps {
  summary: TransactionSummary;
}

export const FinancialTipsCard: React.FC<FinancialTipsCardProps> = ({ summary }) => {
  const { colors } = useTheme();

  const tip = useMemo(() => {
    const expenses = summary.total_expense || 0;
    const income = summary.total_income || 0;

    if (income === 0 && expenses === 0) {
      return {
        icon: 'lightbulb-on-outline' as any,
        color: '#FFB300',
        title: 'Dica do Dia',
        message: 'Registre suas primeiras receitas e despesas para começarmos a analisar suas finanças.'
      };
    }

    if (summary.anomaly_alerts && summary.anomaly_alerts.length > 0) {
      return {
        icon: 'alert-decagram-outline' as any,
        color: '#FF5252',
        title: 'Alerta de Gastos Anormais!',
        message: summary.anomaly_alerts[0] || 'Um dos seus gastos recentes está muito acima da média dos últimos 3 meses.'
      };
    }

    if (expenses > income) {
      return {
        icon: 'alert-circle-outline' as any,
        color: '#F44336',
        title: 'Atenção aos Gastos!',
        message: 'Suas despesas superaram suas receitas este mês. Tente cortar gastos supérfluos ou revisar seu orçamento.'
      };
    }

    if (expenses > income * 0.8) {
      return {
        icon: 'information-outline' as any,
        color: '#FF9800',
        title: 'Quase lá!',
        message: 'Você já gastou mais de 80% da sua renda. Evite compras parceladas até o final do mês.'
      };
    }

    return {
      icon: 'star-outline' as any,
      color: '#4CAF50',
      title: 'Muito bem!',
      message: 'Suas finanças estão saudáveis! Que tal criar uma meta de reserva de emergência com a sobra?'
    };
  }, [summary]);

  return (
    <View style={[styles.container, { backgroundColor: tip.color + '15', borderColor: tip.color + '40' }]}>
      <Icon name={tip.icon} size={28} color={tip.color} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: tip.color }]}>{tip.title}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{tip.message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 24,
    marginTop: 20,
    alignItems: 'center',
    gap: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});
