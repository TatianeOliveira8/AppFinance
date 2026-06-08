import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/helpers';

// Habilita animações no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface AnomalyAlert {
  category_name: string;
  category_icon?: string;
  category_color?: string;
  current_month_total: number;
  avg_last_3_months: number;
  increase_pct: number;       // Ex: 45.2 (%)
  severity: 'warning' | 'critical'; // ≥30% = warning; ≥80% = critical
}

interface AnomalyAlertCardProps {
  alerts: AnomalyAlert[];
}

export const AnomalyAlertCard: React.FC<AnomalyAlertCardProps> = ({ alerts }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(true);

  if (!alerts || alerts.length === 0) return null;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  const getSeverityColor = (severity: AnomalyAlert['severity']) =>
    severity === 'critical' ? '#EF5350' : '#FFA726';

  const getSeverityLabel = (severity: AnomalyAlert['severity']) =>
    severity === 'critical' ? 'Crítico' : 'Elevado';

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Icon name="trending-up" size={24} color="#FF5252" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Atenção aos Gastos
            </Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {alerts.length} alerta{alerts.length > 1 ? 's' : ''} de aumento significativo
            </Text>
          </View>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.alertsList}>
          {alerts.map((alert, idx) => {
            const alertColor = getSeverityColor(alert.severity);
            const isLast = idx === alerts.length - 1;

            return (
              <View
                key={idx}
                style={[
                  styles.alertRow,
                  !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border + '50' }
                ]}
              >
                <View style={[styles.catIcon, { backgroundColor: alertColor + '15' }]}>
                  <Icon
                    name={(alert.category_icon || 'tag-outline') as any}
                    size={20}
                    color={alertColor}
                  />
                </View>

                <View style={styles.alertInfo}>
                  <Text style={[styles.alertDescription, { color: colors.textMuted }]}>
                    Seu gasto com <Text style={{fontWeight: 'bold', color: colors.text}}>{alert.category_name.toLowerCase()}</Text> subiu <Text style={{fontWeight: 'bold', color: alertColor}}>{alert.increase_pct.toFixed(0)}%</Text> este mês.
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    marginTop: 10,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  alertsList: {
    marginTop: 16,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertInfo: {
    flex: 1,
  },
  alertDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
