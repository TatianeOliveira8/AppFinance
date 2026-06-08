import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { transactionService, TransactionSummary } from '../services/transactionService';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../context/ThemeContext';
import { notificationService } from '../services/notificationService';
import { useOffline } from '../context/OfflineContext';
import api from '../services/api';

// Components
import { SummaryCard } from '../components/SummaryCard';
import { CategoryBar } from '../components/CategoryBar';
import { CategoryDetailsModal } from '../components/CategoryDetailsModal';
import { DashboardCharts } from '../components/DashboardCharts';
import { FinancialTipsCard } from '../components/FinancialTipsCard';
import { AnomalyAlertCard } from '../components/AnomalyAlertCard';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayType, setDisplayType] = useState<'expense' | 'income'>('expense');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string; isDefault?: boolean; budget_limit?: number } | null>(null);
  const [anomalyAlerts, setAnomalyAlerts] = useState<any[]>([]);
  const [dailyFlowData, setDailyFlowData] = useState<{ day: number; label: string; income: number; expense: number; balance: number; }[]>([]);
  const { colors } = useTheme();
  const { isOnline, syncing } = useOffline();

  const [educationalTip, setEducationalTip] = useState('');

  useEffect(() => {
    const tips = [
      "Que tal criar uma meta de emergência para imprevistos?",
      "Sabia que parcelar muitas compras pode comprometer sua renda dos próximos meses?",
      "Revisar e cancelar assinaturas que você não usa pode liberar um bom dinheiro!",
      "Investir uma pequena porcentagem do seu salário é o primeiro passo para o futuro.",
      "Seus gastos com lazer estão dentro do planejado? É sempre bom checar!"
    ];
    setEducationalTip(tips[Math.floor(Math.random() * tips.length)]);
  }, []);

  // Dynamic Tab Height with safety fallback
  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    tabBarHeight = Platform.OS === 'android' ? 90 : 60;
  }

  // Month State
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthName = useMemo(() => {
    return currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  useEffect(() => {
    notificationService.requestPermissions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentDate])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getSummary(
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );
      setSummary(data);

      // Pré-carrega todas as transações em background para garantir que a consulta offline funcione
      if (isOnline) {
        transactionService.getTransactions().catch(() => {});
      }

      // RF18: Carregar alertas de gastos anormais (falha silenciosa)
      const alertsData = await transactionService.getSpendingAlerts(
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );
      setAnomalyAlerts(alertsData.alerts);

      // RF28: Carregar fluxo de caixa diário (falha silenciosa)
      const flowData = await transactionService.getDailyFlow(
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );
      setDailyFlowData(flowData.daily_flow || []);

      // Verificar se o perfil financeiro existe (Requisito 2)
      try {
        await api.get('/api/financial-profile');
        setHasProfile(true);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setHasProfile(false);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const handleCategoryPress = (categoryId: number, categoryName: string, isDefault?: boolean) => {
    // Buscar a categoria completa no resumo para pegar o budget_limit atual
    const catData = activeCategories?.find(c => c.id === categoryId);
    setSelectedCategory({
      id: categoryId,
      name: categoryName,
      isDefault: isDefault || false,
      budget_limit: catData?.budget_limit
    });
    setModalVisible(true);
  };

  const handleCategoryDelete = () => {
    // Recarrega o dashboard após deletar
    loadData();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const activeCategories = displayType === 'expense' ? summary?.by_category : summary?.by_category_income;

  if (loading && !summary) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* BANNER DE PRIMEIRO ACESSO (REQUISITO 2) */}
      {!hasProfile && (
        <TouchableOpacity 
          style={[styles.welcomeBanner, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('FinancialProfile')}
        >
          <View style={styles.welcomeInfo}>
            <Icon name="star-face" size={32} color="#FFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeTitle}>Seja bem-vindo(a)! 🚀</Text>
              <Text style={styles.welcomeSub}>Configure seu perfil financeiro para uma experiência personalizada.</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#FFF" />
          </View>
        </TouchableOpacity>
      )}

      {/* STATUS DE CONEXÃO / SINCRONIZAÇÃO */}
      {!isOnline && (
        <View style={[styles.offlineBar, { backgroundColor: '#FF9800' }]}>
          <Icon name="wifi-off" size={16} color="#FFF" />
          <Text style={styles.offlineText}>Você está offline.</Text>
        </View>
      )}
      {syncing && (
        <View style={[styles.offlineBar, { backgroundColor: colors.accent }]}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.offlineText}>Sincronizando transações pendentes...</Text>
        </View>
      )}

      {/* HEADER COM NAVEGAÇÃO DE MÊS */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={[styles.navBtn, { backgroundColor: colors.surface }]}>
          <Icon name="chevron-left" size={28} color={colors.accent} />
        </TouchableOpacity>

        <View style={styles.monthDisplay}>
          <Text style={[styles.monthText, { color: colors.text }]}>{monthName}</Text>
        </View>

        <TouchableOpacity onPress={() => changeMonth(1)} style={[styles.navBtn, { backgroundColor: colors.surface }]}>
          <Icon name="chevron-right" size={28} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <SummaryCard
        balance={summary?.total_balance || 0}
        income={summary?.total_income || 0}
        expense={summary?.total_expense || 0}
        pendingIncome={summary?.pending_income || 0}
        pendingExpense={summary?.pending_expense || 0}
        incomePendingList={summary?.income_pending_list || []}
        expensePendingList={summary?.expense_pending_list || []}
      />

      {/* REQ 29 - DICAS FINANCEIRAS DINÂMICAS */}
      {summary && (
        <FinancialTipsCard summary={summary} />
      )}

      {summary && (
        <DashboardCharts
          pieData={summary.by_category.map(c => ({ name: c.name, value: c.value, color: c.color }))}
          evolutionData={summary.balance_evolution || []}
          dailyFlowData={dailyFlowData}
        />
      )}


      {/* ALERTAS DE GASTOS ANORMAIS (MÉDIA DE 3 MESES) */}
      {anomalyAlerts && anomalyAlerts.length > 0 && (
        <AnomalyAlertCard alerts={anomalyAlerts} />
      )}

      {/* AÇÕES RÁPIDAS UNIFICADAS (ESTILO PROFISSIONAL) */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.quickActionsScroll}
      >
        {[
          { icon: 'arrow-up', label: 'Receita', color: '#4CAF50', route: 'Transaction', params: { type: 'income' } },
          { icon: 'arrow-down', label: 'Gasto', color: '#F44336', route: 'Transaction', params: { type: 'expense' } },
          { icon: 'swap-horizontal', label: 'Transferir', color: '#2196F3', route: 'Transfers' },
          { icon: 'format-list-bulleted', label: 'Transações', color: colors.accent, route: 'History' },
          { icon: 'brain', label: 'Planejar', color: '#9C27B0', route: 'FinancialPlanning' },
          { icon: 'account-group', label: 'Dividir', color: '#00BCD4', route: 'ExpenseGroups' },
          { icon: 'file-document-outline', label: 'Conciliar', color: '#FF9800', route: 'Reconciliation' },
          { icon: 'map-marker-radius', label: 'Mapa', color: '#795548', route: 'Map' }
        ].map((action, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.circleActionBtn}
            onPress={() => navigation.navigate(action.route, action.params)}
          >
            <View style={[styles.circleActionIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon name={action.icon as any} size={28} color={action.color} />
            </View>
            <Text style={[styles.circleActionLabel, { color: colors.textSecondary }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>




      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Distribuição ({activeCategories?.length || 0})</Text>
          <View style={[styles.toggleGroup, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight }]}>
            <TouchableOpacity
              onPress={() => setDisplayType('expense')}
              style={[styles.toggleBtn, displayType === 'expense' && [styles.toggleBtnActive, { backgroundColor: colors.surface }]]}
            >
              <Text style={[styles.toggleText, { color: colors.textMuted }, displayType === 'expense' && { color: colors.accent }]}>Gastos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDisplayType('income')}
              style={[styles.toggleBtn, displayType === 'income' && [styles.toggleBtnActive, { backgroundColor: colors.surface }]]}
            >
              <Text style={[styles.toggleText, { color: colors.textMuted }, displayType === 'income' && { color: colors.accent }]}>Receitas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeCategories && activeCategories.length > 0 ? (
          activeCategories.map((cat, idx) => (
            <CategoryBar
              key={idx}
              name={cat.name}
              value={cat.value}
              percentage={cat.percentage}
              icon={cat.icon}
              color={cat.color}
              categoryId={cat.id}
              isDefault={cat.isDefault}
              budgetLimit={cat.budget_limit}
              onPress={handleCategoryPress}
            />
          ))
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={styles.emptyText}>Nada registrado em {displayType === 'expense' ? 'Gastos' : 'Receitas'} para {monthName}.</Text>
          </View>
        )}
      </View>

      {selectedCategory && (
        <CategoryDetailsModal
          visible={modalVisible}
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
          isDefault={!!(selectedCategory.isDefault || selectedCategory.isDefault)}
          budgetLimit={selectedCategory.budget_limit}
          onClose={() => setModalVisible(false)}
          onDelete={handleCategoryDelete}
          onDeleteCategory={handleCategoryDelete}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 10,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center'
  },
  monthText: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'capitalize'
  },
  quickActionsScroll: {
    paddingHorizontal: 24,
    marginTop: 30,
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  circleActionBtn: {
    alignItems: 'center',
    gap: 8,
    width: 72,
  },
  circleActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  circleActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  toggleGroup: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
  },
  toggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10
  },
  toggleBtnActive: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  toggleText: { fontSize: 13, fontWeight: 'bold', color: '#999' },
  toggleTextActive: { color: '#FF8C00' },
  emptyState: { padding: 40, alignItems: 'center', borderRadius: 20, width: '100%' },
  emptyText: { fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    marginTop: 50,
  },
  offlineText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  welcomeBanner: {
    margin: 20,
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginTop: 60,
  },
  welcomeInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  welcomeTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  welcomeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
});
