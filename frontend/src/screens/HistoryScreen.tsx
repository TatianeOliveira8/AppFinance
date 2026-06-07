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
  TextInput,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { transactionService, Transaction, Category } from '../services/transactionService';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../context/ThemeContext';

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

  // Category and Search Filters
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'dinheiro' | 'credito' | 'debito'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const selectedCategoryInfo = categories.find(c => c.id === selectedCategory);

  const getCategoryIcon = (category: Category | null): any => {
    if (!category) return 'tag';
    if (category.icon) return category.icon;
    const n = category.name.toLowerCase();
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

  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    tabBarHeight = Platform.OS === 'android' ? 90 : 60;
  }

  const { colors, isDark } = useTheme();

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [filter, days, startDate, endDate, selectedCategory, searchText, paymentMethodFilter, sortBy, sortOrder])
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await transactionService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    };
    fetchCategories();
  }, []);

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

      const data = await transactionService.getTransactions({
        type: filter === 'all' ? undefined : filter,
        days,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        category_id: selectedCategory || undefined,
        search: searchText || undefined,
        payment_method: paymentMethodFilter === 'all' ? undefined : paymentMethodFilter,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      setTransactions(data);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
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
    setSelectedCategory(null);
    setSearchText('');
    setPaymentMethodFilter('all');
    setShowFilters(false);
  };

  const setPresetDays = (val: number) => {
    setDays(val);
    setStartDate(null);
    setEndDate(null);
  };

  const filteredTransactions = transactions.filter(t => {
    const isPaid = t.is_paid !== false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'paid') return isPaid;
    if (statusFilter === 'pending') return !isPaid;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-left" size={30} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Transações</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterToggle, { backgroundColor: colors.accentLight, borderColor: colors.accent + '40' }, (days || startDate) && { backgroundColor: colors.accent, borderColor: colors.accent }]}
        >
          <Icon name="filter-variant" size={24} color={(days || startDate) ? "#FFF" : colors.accent} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={[styles.filterMenu, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.filterTitle, { color: colors.text }]}>Filtrar Período</Text>

          <View style={styles.presets}>
            {[7, 15, 30].map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.presetBtn, { backgroundColor: colors.surfaceVariant }, days === v && { backgroundColor: colors.accent }]}
                onPress={() => setPresetDays(v)}
              >
                <Text style={[styles.presetText, days === v && styles.presetTextActive]}>{v} dias</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customDateLine}>
            <TouchableOpacity style={[styles.datePickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowStartPicker(true)}>
              <Text style={[styles.datePickerLabel, { color: colors.textMuted }]}>De:</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>{startDate ? startDate.toLocaleDateString() : 'Selecionar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.datePickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowEndPicker(true)}>
              <Text style={[styles.datePickerLabel, { color: colors.textMuted }]}>Até:</Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>{endDate ? endDate.toLocaleDateString() : 'Selecionar'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.clearBtnText}>Limpar Filtros</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.filterBar, { backgroundColor: colors.surface }]}>
        {(['all', 'income', 'expense'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border }, filter === f && [styles.filterBtnActive, { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnText, { color: colors.textSecondary }, filter === f && { color: colors.accent, fontWeight: 'bold' }]}>
              {f === 'all' ? 'Tudo' : f === 'income' ? 'Entradas' : 'Saídas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.filterBar, { paddingTop: 0, backgroundColor: colors.surface }]}>
        {(['all', 'paid', 'pending'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusBtn, { backgroundColor: colors.surface, borderColor: colors.border }, statusFilter === s && [styles.statusBtnActive, { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.statusBtnText, { color: colors.textSecondary }, statusFilter === s && { color: colors.accent, fontWeight: 'bold' }]}>
              {s === 'all' ? 'Status' : s === 'paid' ? 'Pago' : 'Pendente'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.filterBar, { paddingTop: 0, paddingBottom: 10, backgroundColor: colors.surface }]}>
        {(['all', 'dinheiro', 'credito', 'debito'] as const).map((pm) => (
          <TouchableOpacity
            key={pm}
            style={[styles.statusBtn, { backgroundColor: colors.surface, borderColor: colors.border }, paymentMethodFilter === pm && [styles.statusBtnActive, { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]]}
            onPress={() => setPaymentMethodFilter(pm)}
          >
            <Text style={[styles.statusBtnText, { color: colors.textSecondary }, paymentMethodFilter === pm && { color: colors.accent, fontWeight: 'bold' }]}>
              {pm === 'all' ? 'Pagam.' : pm === 'dinheiro' ? 'Dinheiro' : pm === 'credito' ? 'Crédito' : 'Débito'}
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

      <View style={[styles.filterMenu, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Buscar por descrição"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={colors.placeholder}
        />
        <TouchableOpacity
          style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setCategoryModalVisible(true)}
        >
          {selectedCategoryInfo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.miniCircle, { backgroundColor: (selectedCategoryInfo.color || colors.accent) + '20' }]}>
                <Icon name={getCategoryIcon(selectedCategoryInfo)} size={16} color={selectedCategoryInfo.color || colors.accent} />
              </View>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{selectedCategoryInfo.name}</Text>
            </View>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>Todas as categorias</Text>
          )}
          <Icon name="chevron-down" size={20} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <View style={styles.sortOptions}>
          <TouchableOpacity onPress={() => setSortBy('date')}>
            <Text style={[sortBy === 'date' ? styles.activeSort : styles.inactiveSort, { color: sortBy === 'date' ? colors.accent : colors.textSecondary }]}>Data</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSortBy('value')}>
            <Text style={[sortBy === 'value' ? styles.activeSort : styles.inactiveSort, { color: sortBy === 'value' ? colors.accent : colors.textSecondary }]}>Valor</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
            <Text style={{ color: colors.text }}>{sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
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
              paymentMethod={item.payment_method}
              receiptPhoto={item.receipt_photo}
              contactName={item.contact_name}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="clipboard-text-outline" size={60} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma transação encontrada para este período.</Text>
            </View>
          }
        />
      )}

      {/* MODAL DE SELEÇÃO DE CATEGORIA */}
      <Modal visible={categoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Categorias</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
             <FlatList
              data={[{ id: null as any, name: 'Todas as categorias' }, ...categories]}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => {
                const catItem = item as any;
                return (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => { setSelectedCategory(catItem.id); setCategoryModalVisible(false); }}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: catItem.id ? (catItem.color || colors.accent) + '15' : colors.accentLight }]}>
                      <Icon name={catItem.id ? getCategoryIcon(catItem) : 'tag-multiple'} size={24} color={catItem.id ? (catItem.color || colors.accent) : colors.accent} />
                    </View>
                    <Text style={[styles.categoryName, { color: colors.text, fontWeight: catItem.id === selectedCategory ? 'bold' : 'normal' }]}>{catItem.name}</Text>
                    {catItem.id === selectedCategory && (
                      <Icon name="check" size={20} color={colors.accent} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent'
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  filterToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  filterToggleActive: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00'
  },
  filterMenu: {
    padding: 20,
    borderBottomWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  filterTitle: { fontSize: 16, fontWeight: '700', marginBottom: 15 },
  presets: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  presetBtnActive: { backgroundColor: '#FF8C00' },
  presetText: { fontSize: 13, fontWeight: '600' },
  presetTextActive: { color: '#FFF' },
  customDateLine: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  datePickerBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  datePickerLabel: { fontSize: 10, color: '#999', textTransform: 'uppercase', marginBottom: 4 },
  dateValue: { fontSize: 14, fontWeight: '700' },
  clearBtn: { alignItems: 'center', padding: 10 },
  clearBtnText: { color: '#FF5252', fontWeight: '700', fontSize: 14 },
  filterBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  filterBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#FF8C00' },
  filterBtnText: { color: '#666', fontWeight: '600', fontSize: 13 },
  filterBtnTextActive: { color: '#FFF' },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusBtnActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  statusBtnText: { color: '#999', fontWeight: '600', fontSize: 12 },
  statusBtnTextActive: { color: '#FFF' },
  listContent: { paddingHorizontal: 24, paddingTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 80, alignItems: 'center' },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 15, fontSize: 14, fontStyle: 'italic' },
  searchInput: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  pickerButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContentFull: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  categoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  categoryName: { fontSize: 16, flex: 1 },
  sortOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activeSort: {
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  inactiveSort: {
    color: '#666',
  },
});
