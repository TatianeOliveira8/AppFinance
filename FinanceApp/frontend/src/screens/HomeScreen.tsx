import React, { useState, useCallback, useMemo } from 'react';
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

// Components
import { SummaryCard } from '../components/SummaryCard';
import { CategoryBar } from '../components/CategoryBar';
import { CategoryDetailsModal } from '../components/CategoryDetailsModal';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayType, setDisplayType] = useState<'expense' | 'income'>('expense');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string } | null>(null);

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

  const handleCategoryPress = (categoryId: number, categoryName: string) => {
    setSelectedCategory({ id: categoryId, name: categoryName });
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* HEADER COM NAVEGAÇÃO DE MÊS */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <Icon name="chevron-left" size={28} color="#FF8C00" />
        </TouchableOpacity>

        <View style={styles.monthDisplay}>
          <Text style={styles.monthText}>{monthName}</Text>
        </View>

        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <Icon name="chevron-right" size={28} color="#FF8C00" />
        </TouchableOpacity>
      </View>

      <SummaryCard
        balance={summary?.balance || 0}
        income={summary?.total_income || 0}
        expense={summary?.total_expense || 0}
        pendingIncome={summary?.pending_income || 0}
        pendingExpense={summary?.pending_expense || 0}
      />

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderLeftColor: '#FF8C00' }]}
          onPress={() => navigation.navigate('Transaction', { type: 'income' })}
        >
          <Text style={styles.actionBtnLabel}>Nova Receita</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderLeftColor: '#333' }]}
          onPress={() => navigation.navigate('Transaction', { type: 'expense' })}
        >
          <Text style={styles.actionBtnLabel}>Novo Gasto</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.historyBtn}
        onPress={() => navigation.navigate('History')}
      >
        <Text style={styles.historyBtnText}>Visualizar histórico completo</Text>
        <Icon name="arrow-right" size={20} color="#FF8C00" />
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Distribuição ({activeCategories?.length || 0})</Text>
          <View style={styles.toggleGroup}>
            <TouchableOpacity
              onPress={() => setDisplayType('expense')}
              style={[styles.toggleBtn, displayType === 'expense' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, displayType === 'expense' && styles.toggleTextActive]}>Gastos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDisplayType('income')}
              style={[styles.toggleBtn, displayType === 'income' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, displayType === 'income' && styles.toggleTextActive]}>Receitas</Text>
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
              onPress={handleCategoryPress}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nada registrado em {displayType === 'expense' ? 'Gastos' : 'Receitas'} para {monthName}.</Text>
          </View>
        )}
      </View>

      {selectedCategory && (
        <CategoryDetailsModal
          visible={modalVisible}
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
          onClose={() => setModalVisible(false)}
          onDelete={handleCategoryDelete}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
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
    backgroundColor: '#FFF',
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
    color: '#1A1A1A',
    textTransform: 'capitalize'
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 30,
    gap: 12,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  actionBtnLabel: { fontSize: 13, fontWeight: '700', color: '#333' },
  historyBtn: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: '#FFF4E5',
    padding: 18,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'center',
    width: '90%',
    maxWidth: 600,
    borderWidth: 1,
    borderColor: '#FFE0B2'
  },
  historyBtnText: { color: '#FF8C00', fontWeight: 'bold', fontSize: 15 },
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
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  toggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10
  },
  toggleBtnActive: {
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  toggleText: { fontSize: 13, fontWeight: 'bold', color: '#999' },
  toggleTextActive: { color: '#FF8C00' },
  emptyState: { padding: 40, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, width: '100%' },
  emptyText: { color: '#999', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }
});
