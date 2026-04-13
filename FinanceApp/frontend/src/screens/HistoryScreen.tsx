import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { transactionService, Transaction } from '../services/transactionService';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

// Components
import { TransactionItem } from '../components/TransactionItem';

export const HistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Date Filters
  const [showFilters, setShowFilters] = useState(false);
  const [days, setDays] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    tabBarHeight = Platform.OS === 'android' ? 90 : 60;
  }

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [filter, days, startDate, endDate])
  );

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const formatDate = (date: Date | null) => {
        if (!date) return undefined;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const data = await transactionService.listTransactions(
        filter,
        days,
        formatDate(startDate),
        formatDate(endDate)
      );
      setTransactions(data);
    } catch (error) {
      console.error('Erro ao carregar extrato:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setDays(undefined);
    setStartDate(null);
    setEndDate(null);
    setShowFilters(false);
  };

  const setPresetDays = (val: number) => {
    setDays(val);
    setStartDate(null);
    setEndDate(null);
  };

  const filteredTransactions = transactions.filter(t => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'paid') return t.is_paid;
    if (statusFilter === 'pending') return !t.is_paid;
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-left" size={30} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Meu Histórico</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterToggle, (days || startDate) && styles.filterToggleActive]}
        >
          <Icon name="filter-variant" size={24} color={(days || startDate) ? "#FFF" : "#FF8C00"} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterMenu}>
          <Text style={styles.filterTitle}>Filtrar Período</Text>

          <View style={styles.presets}>
            {[7, 15, 30].map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.presetBtn, days === v && styles.presetBtnActive]}
                onPress={() => setPresetDays(v)}
              >
                <Text style={[styles.presetText, days === v && styles.presetTextActive]}>{v} dias</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customDateLine}>
            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.datePickerLabel}>De:</Text>
              <Text style={styles.dateValue}>{startDate ? startDate.toLocaleDateString() : 'Selecionar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.datePickerLabel}>Até:</Text>
              <Text style={styles.dateValue}>{endDate ? endDate.toLocaleDateString() : 'Selecionar'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.clearBtnText}>Limpar Filtros</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filterBar}>
        {(['all', 'income', 'expense'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'all' ? 'Tudo' : f === 'income' ? 'Entradas' : 'Saídas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.filterBar, { paddingTop: 0 }]}>
        {(['all', 'paid', 'pending'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusBtn, statusFilter === s && styles.statusBtnActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.statusBtnText, statusFilter === s && styles.statusBtnTextActive]}>
              {s === 'all' ? 'Status' : s === 'paid' ? 'Pago' : 'Pendente'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          onChange={(e, date) => {
            setShowStartPicker(false);
            if (date) {
              if (endDate && date > endDate) {
                setEndDate(null);
              }
              setStartDate(date);
              setDays(undefined);
            }
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          onChange={(e, date) => {
            setShowEndPicker(false);
            if (date) {
              if (startDate && date < startDate) {
                Alert.alert("Data Inválida", "O fim do período não pode ser antes do início.");
                return;
              }
              setEndDate(date);
              setDays(undefined);
            }
          }}
        />
      )}

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF8C00" />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TransactionItem
              type={item.type}
              value={item.value}
              description={item.description}
              date={item.date}
              is_paid={item.is_paid}
              categoryName={item.category?.name}
              categoryIcon={item.category?.icon}
              categoryColor={item.category?.color}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="clipboard-text-outline" size={60} color="#DDD" />
              <Text style={styles.emptyText}>Nenhuma transação encontrada para este período.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  filterToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF4E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0B2'
  },
  filterToggleActive: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00'
  },
  filterMenu: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  filterTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 15 },
  presets: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center'
  },
  presetBtnActive: { backgroundColor: '#FF8C00' },
  presetText: { fontSize: 13, color: '#666', fontWeight: '600' },
  presetTextActive: { color: '#FFF' },
  customDateLine: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  datePickerBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  datePickerLabel: { fontSize: 10, color: '#999', textTransform: 'uppercase', marginBottom: 4 },
  dateValue: { fontSize: 14, color: '#333', fontWeight: '700' },
  clearBtn: { alignItems: 'center', padding: 10 },
  clearBtnText: { color: '#FF5252', fontWeight: '700', fontSize: 14 },
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFF'
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#FF8C00' },
  filterBtnText: { color: '#666', fontWeight: '600', fontSize: 13 },
  filterBtnTextActive: { color: '#FFF' },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  statusBtnActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  statusBtnText: { color: '#999', fontWeight: '600', fontSize: 12 },
  statusBtnTextActive: { color: '#FFF' },
  listContent: { paddingHorizontal: 24, paddingTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 80, alignItems: 'center' },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 15, fontSize: 14, fontStyle: 'italic' },
});
