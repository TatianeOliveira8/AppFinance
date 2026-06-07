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
      {/* Header clicável para expandir/colapsar */}
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: colors.accent + '15' }]}>
            <Icon name="alert-decagram-outline" size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Gastos Anormais Detectados
            </Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {alerts.length} categoria{alerts.length > 1 ? 's' : ''} acima da média
            </Text>
          </View>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {/* Lista de alertas */}
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
                  { 
                    backgroundColor: colors.inputBg, 
                    borderColor: colors.border,
                    borderLeftColor: alertColor,
                  },
                  !isLast && styles.alertRowMargin
                ]}
              >
                {/* Ícone da Categoria */}
                <View style={[styles.catIcon, { backgroundColor: alert.category_color ? alert.category_color + '15' : alertColor + '15' }]}>
                  <Icon
                    name={(alert.category_icon || 'tag-outline') as any}
                    size={20}
                    color={alert.category_color || alertColor}
                  />
                </View>

                {/* Informações da anomalia */}
                <View style={styles.alertInfo}>
                  <View style={styles.alertTitleRow}>
                    <Text style={[styles.catName, { color: colors.text }]} numberOfLines={1}>
                      {alert.category_name}
                    </Text>
                    <View style={[styles.severityBadge, { backgroundColor: alertColor + '15' }]}>
                      <View style={[styles.severityDot, { backgroundColor: alertColor }]} />
                      <Text style={[styles.severityText, { color: alertColor }]}>
                        {getSeverityLabel(alert.severity)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatCurrency(alert.current_month_total)}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      vs. média de {formatCurrency(alert.avg_last_3_months)}
                    </Text>
                  </View>
                </View>

                {/* Badge de Aumento Percentual */}
                <View style={[styles.percentageBadge, { backgroundColor: alertColor + '15' }]}>
                  <Text style={[styles.percentageText, { color: alertColor }]}>
                    +{alert.increase_pct.toFixed(0)}%
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
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '855',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  alertsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 5,
    padding: 12,
    gap: 12,
  },
  alertRowMargin: {
    marginBottom: 10,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertInfo: {
    flex: 1,
    gap: 4,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    fontSize: 15,
    fontWeight: '700',
    maxWidth: '60%',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  percentageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
