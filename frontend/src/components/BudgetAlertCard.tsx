import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';

interface BudgetAlertCardProps {
  categoryName: string;
  spent: number;
  limit: number;
  percentage: number;
  icon?: string;
  color?: string;
}

export const BudgetAlertCard: React.FC<BudgetAlertCardProps> = ({
  categoryName,
  spent,
  limit,
  percentage,
  icon,
  color
}) => {
  const { colors } = useTheme();
  const isExceeded = spent > limit;
  const isWarning = percentage >= 80;

  // Define cores baseado no nível de alerta
  const alertColor = isExceeded ? colors.danger : isWarning ? '#FFA500' : colors.accent;
  const alertBg = isExceeded ? colors.danger + '10' : isWarning ? '#FFA50010' : colors.accent + '10';
  const alertTitle = isExceeded ? '⚠️ Limite Excedido!' : '⚡ Atenção ao Orçamento!';

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
    <View style={[styles.alertCard, { backgroundColor: alertBg, borderColor: alertColor }]}>
      <View style={styles.alertHeader}>
        <View style={[styles.iconCircle, { backgroundColor: alertColor + '20' }]}>
          <Icon
            name={isExceeded ? 'alert-circle' : 'alert'}
            size={20}
            color={alertColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.alertTitle, { color: alertColor }]}>{alertTitle}</Text>
          <Text style={[styles.alertSubtitle, { color: colors.textMuted }]}>
            {categoryName}
          </Text>
        </View>
      </View>

      <View style={styles.alertContent}>
        <View style={styles.alertStats}>
          <View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Gasto</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(spent)}</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Limite</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(limit)}</Text>
          </View>
          <View style={styles.divider} />
          <View>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Uso</Text>
            <Text style={[styles.statValue, { color: alertColor }]}>{percentage.toFixed(0)}%</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: alertColor
                }
              ]}
            />
          </View>
        </View>

        {isExceeded && (
          <Text style={[styles.alertMessage, { color: colors.danger }]}>
            Você excedeu o limite em {formatCurrency(spent - limit)}
          </Text>
        )}
        {isWarning && !isExceeded && (
          <Text style={[styles.alertMessage, { color: '#FFA500' }]}>
            Você atingiu {percentage.toFixed(0)}% do seu orçamento. Cuidado com os próximos gastos!
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  alertCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  alertContent: {
    gap: 12,
  },
  alertStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#CCCCCC30',
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  alertMessage: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
