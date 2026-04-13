import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { transactionService, Category } from '../services/transactionService';
import { getTransactionTypeColor, getTransactionTypeLabel, formatDate } from '../utils/helpers';

const AVAILABLE_ICONS = [
  'trending-up', 'briefcase-outline', 'paw', 'run', 'school-outline',
  'cart-outline', 'heart-outline', 'star-outline', 'camera-outline', 'airplane'
];

const AVAILABLE_COLORS = [
  '#FF5252', '#448AFF', '#4CAF50', '#FFD740', '#E040FB',
  '#FF9100', '#00BCD4', '#607D8B', '#1A1A1A'
];

export const TransactionScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { type } = route.params;
  const themeColor = getTransactionTypeColor(type);

  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [isPaid, setIsPaid] = useState(true);
  const [isFixed, setIsFixed] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState<string>(new Date().getDate().toString());

  const [categories, setCategories] = useState<Category[]>([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryModalVisible, setNewCategoryModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false); // Adicionado aqui

  // Custom Toast State
  const [showToast, setShowToast] = useState(false);

  // States for New Category
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('tag');
  const [newCategoryColor, setNewCategoryColor] = useState(themeColor);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setFetchingCategories(true);
      const data = await transactionService.getCategories(type as any);
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0]);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    } finally {
      setFetchingCategories(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await transactionService.createCategory(
        newCategoryName,
        type as any,
        newCategoryIcon,
        newCategoryColor
      );
      setCategories([...categories, newCat]);
      setSelectedCategory(newCat);
      resetNewCategoryForm();
      setNewCategoryModalVisible(false);
      setCategoryModalVisible(false);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar a categoria.');
    }
  };

  const handleIsPaidChange = (val: boolean) => {
    setIsPaid(val);
    // Se marcou como pago e a data é futura, volta pra hoje
    if (val && date > new Date()) {
      setDate(new Date());
    }
  };

  const resetNewCategoryForm = () => {
    setNewCategoryName('');
    setNewCategoryIcon('tag');
    setNewCategoryColor(themeColor);
  };

  const formatToCurrency = (val: string) => {
    // Remove tudo o que não for número
    let cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) return '';

    // Converte para centavos
    let intVal = parseInt(cleanVal);
    let formatted = (intVal / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatted;
  };

  const handleValueChange = (text: string) => {
    const formatted = formatToCurrency(text);
    setValue(formatted);
  };

  const handleSave = async () => {
    // Converte de "1.234,56" para 1234.56
    const numericValue = value.replace(/\./g, '').replace(',', '.');
    if (!numericValue || parseFloat(numericValue) <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }

    setLoading(true);
    try {
      await transactionService.createTransaction({
        type: type,
        value: parseFloat(numericValue),
        description: description || getTransactionTypeLabel(type),
        category_id: selectedCategory?.id || null,
        date: date.toISOString(),
        is_paid: isPaid,
        is_fixed: isFixed,
        day_of_month: isFixed ? parseInt(dayOfMonth) : null
      });

      // MOSTRAR NOTIFICAÇÃO PREMIUM
      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
        navigation.goBack();
      }, 1500);

    } catch (error: any) {
      Alert.alert('Erro', 'Ocorreu um problema ao salvar.');
    } finally {
      setLoading(false);
    }
  };

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

  const getCategoryColor = (category: Category | null) => {
    if (!category) return themeColor;
    return category.color || themeColor;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* TOAST CUSTOMIZADO (NOTIFICAÇÃO) */}
      {showToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toastCard}>
            <View style={[styles.toastIconCircle, { backgroundColor: themeColor }]}>
              <Icon name="check" size={20} color="#FFF" />
            </View>
            <View>
              <Text style={styles.toastTitle}>Sucesso!</Text>
              <Text style={styles.toastSub}>{getTransactionTypeLabel(type)} salva com sucesso.</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" size={30} color="#666" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Nova {getTransactionTypeLabel(type)}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.valueSection}>
            <Text style={styles.valueLabel}>VALOR</Text>
            <View style={styles.valueInputRow}>
              <Text style={[styles.currency, { color: themeColor }]}>R$</Text>
              <TextInput
                style={[styles.bigInput, { color: themeColor }]}
                placeholder="0,00"
                value={value}
                onChangeText={handleValueChange}
                keyboardType="decimal-pad"
                placeholderTextColor="#DDD"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Data do Pagamento</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={date.toISOString().split('T')[0]}
                max={isPaid ? new Date().toISOString().split('T')[0] : undefined}
                onChange={(e) => setDate(new Date(e.target.value))}
                style={{
                  padding: '18px',
                  borderRadius: '16px',
                  border: '1px solid #EEE',
                  fontSize: '16px',
                  backgroundColor: '#F8F9FA',
                  color: '#333',
                  fontFamily: 'sans-serif'
                }}
              />
            ) : (
              <View>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.pickerButton}>
                  <Icon name="calendar" size={20} color={themeColor} style={{ marginRight: 10 }} />
                  <Text style={styles.pickerButtonText}>{formatDate(date.toISOString())}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    maximumDate={isPaid ? new Date() : undefined}
                    onChange={(e, d) => {
                      setShowDatePicker(false);
                      if (d) setDate(d);
                    }}
                  />
                )}
              </View>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Categoria</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setCategoryModalVisible(true)}
            >
              <View style={[styles.miniCircle, { backgroundColor: getCategoryColor(selectedCategory) + '20' }]}>
                <Icon name={getCategoryIcon(selectedCategory)} size={20} color={getCategoryColor(selectedCategory)} />
              </View>
              <Text style={styles.pickerButtonText}>
                {selectedCategory ? selectedCategory.name : 'Selecione'}
              </Text>
              <Icon name="chevron-down" size={24} color="#BBB" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              style={styles.cleanInput}
              placeholder="Ex: Almoço"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.statusSection}>
            <View style={styles.verticalSwitch}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Já foi {type === 'income' ? 'recebido' : 'pago'}?</Text>
                <Text style={styles.switchSub}>{isPaid ? 'Sim, concluído' : 'Ainda pendente'}</Text>
              </View>
              <Switch value={isPaid} onValueChange={handleIsPaidChange} thumbColor={isPaid ? themeColor : '#CCC'} />
            </View>

            <View style={styles.verticalSwitch}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>É uma despesa fixa?</Text>
                <Text style={styles.switchSub}>Recorrente todo mês</Text>
              </View>
              <Switch value={isFixed} onValueChange={setIsFixed} thumbColor={isFixed ? themeColor : '#CCC'} />
            </View>

            {isFixed && (
              <View style={[styles.fieldGroup, { marginTop: 10 }]}>
                <Text style={styles.fieldLabel}>Dia do Vencimento/Recebimento</Text>
                <TextInput
                  style={styles.cleanInput}
                  keyboardType="numeric"
                  placeholder="Ex: 5"
                  value={dayOfMonth}
                  onChangeText={(val) => {
                    const num = parseInt(val);
                    if (!val || (num >= 1 && num <= 31)) {
                      setDayOfMonth(val);
                    }
                  }}
                />
                <Text style={styles.helperText}>Este lançamento ocorrerá automaticamente todo mês neste dia.</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.mainSaveBtn, { backgroundColor: themeColor }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainSaveBtnText}>Salvar {getTransactionTypeLabel(type)}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL DE SELEÇÃO DE CATEGORIA */}
      <Modal visible={categoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentFull}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Categorias</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Icon name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => { setSelectedCategory(item); setCategoryModalVisible(false); }}
                >
                  <View style={[styles.iconCircle, { backgroundColor: (item.color || themeColor) + '15' }]}>
                    <Icon name={getCategoryIcon(item)} size={28} color={item.color || themeColor} />
                  </View>
                  <Text style={styles.categoryName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.addCategoryItem}
                  onPress={() => setNewCategoryModalVisible(true)}
                >
                  <Icon name="plus-circle" size={40} color={themeColor} style={{ marginRight: 15 }} />
                  <Text style={[styles.categoryName, { color: themeColor, fontWeight: 'bold' }]}>Criar Nova</Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>

      {/* MODAL DE CRIAÇÃO DE NOVA CATEGORIA */}
      <Modal visible={newCategoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentFull, { height: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personalizar</Text>
              <TouchableOpacity onPress={() => setNewCategoryModalVisible(false)}>
                <Icon name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.previewContainer}>
                <View style={[styles.previewCircle, { backgroundColor: newCategoryColor + '20' }]}>
                  <Icon name={newCategoryIcon as any} size={40} color={newCategoryColor} />
                </View>
                <Text style={styles.previewName}>{newCategoryName || 'Novo'}</Text>
              </View>

              <TextInput
                style={styles.cleanInput}
                placeholder="Nome da categoria"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />

              <Text style={styles.sectionLabel}>ESCOLHA UM ÍCONE</Text>
              <View style={styles.gridList}>
                {AVAILABLE_ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.gridItem, newCategoryIcon === icon && { borderColor: themeColor, borderWidth: 2 }]}
                    onPress={() => setNewCategoryIcon(icon)}
                  >
                    <Icon name={icon as any} size={24} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>ESCOLHA UMA COR</Text>
              <View style={styles.gridList}>
                {AVAILABLE_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorItem, { backgroundColor: color }, newCategoryColor === color && { borderColor: '#FFF', borderWidth: 3 }]}
                    onPress={() => setNewCategoryColor(color)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.mainSaveBtn, { backgroundColor: themeColor, marginTop: 30 }]}
                onPress={handleCreateCategory}
              >
                <Text style={styles.mainSaveBtnText}>Criar Categoria</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { paddingBottom: 40 },
  topHeader: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 20 },
  backButton: { marginLeft: -10 },
  screenTitle: { fontSize: 32, fontWeight: '900', color: '#1A1A1A', marginTop: 10 },
  card: { paddingHorizontal: 24, gap: 28 },
  valueSection: { alignItems: 'center' },
  valueLabel: { fontSize: 12, color: '#AAA', fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 8 },
  valueInputRow: { flexDirection: 'row', alignItems: 'center' },
  currency: { fontSize: 24, fontWeight: 'bold', marginRight: 8 },
  bigInput: { fontSize: 56, fontWeight: 'bold', padding: 0 },
  fieldGroup: { gap: 10 },
  fieldLabel: { fontSize: 14, color: '#888', fontWeight: '700', textTransform: 'uppercase' },
  pickerButton: { backgroundColor: '#F8F9FA', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center' },
  pickerButtonText: { fontSize: 16, color: '#333', fontWeight: '500' },
  miniCircle: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cleanInput: { backgroundColor: '#F8F9FA', borderRadius: 20, padding: 18, fontSize: 16, borderWidth: 1, borderColor: '#F0F0F0', color: '#333' },
  mainSaveBtn: { padding: 22, borderRadius: 24, alignItems: 'center', marginTop: 10 },
  mainSaveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContentFull: { backgroundColor: '#FFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold' },
  categoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  addCategoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE' },
  iconCircle: { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  categoryName: { fontSize: 17, color: '#333', flex: 1, fontWeight: '500' },

  sectionLabel: { fontSize: 12, color: '#999', fontWeight: 'bold', marginTop: 20, marginBottom: 12 },
  previewContainer: { alignItems: 'center', marginBottom: 20 },
  previewCircle: { width: 100, height: 100, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  previewName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  gridList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  colorItem: { width: 45, height: 45, borderRadius: 22 },

  // STATUS STYLES (Restaurados)
  statusSection: { gap: 16, marginTop: 10 },
  verticalSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F5F5F5'
  },
  switchInfo: { flex: 1 },
  switchTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  switchSub: { fontSize: 12, color: '#AAA' },

  // TOAST STYLES
  toastContainer: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center', zIndex: 9999, paddingHorizontal: 20 },
  toastCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: '#F0F0F0', width: '100%', maxWidth: 400 },
  toastIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  toastTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  toastSub: { fontSize: 12, color: '#666' }
});
