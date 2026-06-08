import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { expenseGroupsService, ExpenseGroup, GroupMember, GroupExpense, Settlement, SettleCalculation } from '../services/expenseGroupsService';
import { transactionService, Category } from '../services/transactionService';
import { formatDate, formatCurrency } from '../utils/helpers';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Mapeamento de categorias para ícones padrão
const CATEGORY_ICONS: { [key: string]: string } = {
  'moradia': 'home-outline',
  'alimentação': 'silverware-fork-knife',
  'alimentacao': 'silverware-fork-knife', // sem acento
  'transporte': 'car-outline',
  'saúde': 'hospital-box-outline',
  'saude': 'hospital-box-outline', // sem acento
  'lazer': 'gamepad-variant-outline',
  'outros': 'tag',
  'pet': 'paw',
};

const CATEGORY_COLORS: { [key: string]: string } = {
  'moradia': '#FF5252',
  'alimentação': '#FF9100',
  'alimentacao': '#FF9100',
  'transporte': '#FF5252',
  'saúde': '#FF5252',
  'saude': '#FF5252',
  'lazer': '#FF9100',
  'outros': '#FF5252',
  'pet': '#448AFF',
};

const getCategoryIcon = (category: Category): string => {
  const categoryLower = category.name.toLowerCase();
  return CATEGORY_ICONS[categoryLower] || category.icon || 'tag';
};

const getCategoryColor = (category: Category): string => {
  const categoryLower = category.name.toLowerCase();
  return CATEGORY_COLORS[categoryLower] || category.color || '#FF5252';
};

export default function ExpenseGroupDetailsScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { colors } = useTheme();
  const themeColor = colors.accent;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<ExpenseGroup | null>(null);
  const [settlementInfo, setSettlementInfo] = useState<SettleCalculation | null>(null);

  // Add Expense Modal states
  const [expModalVisible, setExpModalVisible] = useState(false);
  const [expCategoryId, setExpCategoryId] = useState<number | null>(null);
  const [expValue, setExpValue] = useState('');
  const [expPaidBy, setExpPaidBy] = useState<number | null>(null);
  const [paidByModalVisible, setPaidByModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Add Member Modal states
  const [memModalVisible, setMemModalVisible] = useState(false);
  const [memName, setMemName] = useState('');
  const [memEmail, setMemEmail] = useState('');

  // Edit Group Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadDetails();
  }, []);

  const formatCurrencyInput = (text: string): string => {
    // Remove caracteres não numéricos
    const cleaned = text.replace(/\D/g, '');
    if (cleaned === '') return '';

    // Converter para número e formatar
    const num = parseInt(cleaned, 10);
    const formatted = (num / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatted;
  };

  const handleExpValueChange = (text: string) => {
    const formatted = formatCurrencyInput(text);
    setExpValue(formatted);
  };

  const loadDetails = async () => {
    setLoading(true);
    try {
      const gData = await expenseGroupsService.getGroup(groupId);
      setGroup(gData);

      const sData = await expenseGroupsService.calculateSettlement(groupId);
      setSettlementInfo(sData);

      const cats = await transactionService.getCategories();
      setCategories(cats.filter(c => c.type === 'expense'));
    } catch (e: any) {
      console.error('Erro em loadDetails:', e);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do grupo: ' + (e?.message || String(e)));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!memEmail.trim()) {
      Alert.alert('Aviso', 'O e-mail é obrigatório para verificar se o usuário está cadastrado no app.');
      return;
    }
    try {
      const verifyRes = await api.get('/api/auth/verify-user?email=' + encodeURIComponent(memEmail.trim()));
      const userData = verifyRes.data;

      await expenseGroupsService.addMember(groupId, userData.full_name, userData.email);
      Alert.alert('Sucesso', 'Membro adicionado!');
      setMemModalVisible(false);
      setMemName('');
      setMemEmail('');
      loadDetails();
    } catch (e: any) {
      const statusCode = e.response?.status;
      let errorMsg = 'Erro ao verificar o usuário.';

      if (statusCode === 404) {
        errorMsg = '⚠️ Usuário sem conta cadastrada\n\nEste e-mail não está registrado no aplicativo. O participante precisa instalar o app e criar uma conta primeiro.';
      } else {
        errorMsg = e.response?.data?.detail || 'Não foi possível adicionar o membro. Certifique-se de que ele tem o app instalado.';
      }

      Alert.alert('Erro', errorMsg);
    }
  };

  const handleAddExpense = async () => {
    if (!expCategoryId || !expValue || !expPaidBy) {
      Alert.alert('Aviso', 'Preencha todos os campos.');
      return;
    }
    const selectedCategory = categories.find(c => c.id === expCategoryId);
    const desc = selectedCategory ? selectedCategory.name : 'Despesa de Grupo';
    try {
      // Converter valor formatado para número
      const numValue = parseFloat(expValue.replace(/\./g, '').replace(',', '.'));
      await expenseGroupsService.addExpense(groupId, desc, numValue, expPaidBy);
      Alert.alert('Sucesso', 'Despesa adicionada!');
      setExpModalVisible(false);
      setExpCategoryId(null);
      setExpValue('');
      setExpPaidBy(null);
      loadDetails();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível adicionar a despesa.');
    }
  };

  const handleSettleGroup = async () => {
    Alert.alert('Liquidar', 'Deseja marcar todas as despesas atuais como liquidadas?', [
      { text: 'Cancelar' },
      {
        text: 'Confirmar', onPress: async () => {
          try {
            await expenseGroupsService.settleGroup(groupId);
            Alert.alert('Sucesso', 'Grupo liquidado!');
            loadDetails();
          } catch (e) {
            Alert.alert('Erro', 'Não foi possível liquidar o grupo.');
          }
        }
      }
    ]);
  };

  const openEditModal = () => {
    if (group) {
      setEditName(group.name);
      setEditDesc(group.description || '');
      setEditModalVisible(true);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editName.trim()) {
      Alert.alert('Aviso', 'O nome do grupo é obrigatório.');
      return;
    }
    try {
      const updated = await expenseGroupsService.updateGroup(groupId, editName.trim(), editDesc.trim() || undefined);
      Alert.alert('Sucesso', 'Grupo atualizado!');
      setEditModalVisible(false);
      setGroup(updated);
      loadDetails();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível atualizar o grupo.');
    }
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Excluir Grupo',
      'Tem certeza que deseja excluir este grupo permanentemente? Todas as despesas e rateios serão apagados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseGroupsService.deleteGroup(groupId);
              Alert.alert('Sucesso', 'Grupo excluído com sucesso!');
              // Passar parâmetro para indicar que o grupo foi deletado
              navigation.navigate('ExpenseGroups', { refreshGroups: true });
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível excluir o grupo.');
            }
          }
        }
      ]
    );
  };

  if (loading || !group) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  const selectedPaidMember = group.members.find(m => m.id === expPaidBy);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={30} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.screenTitle, { color: colors.text }]} numberOfLines={1}>{group.name}</Text>
          {group.description && <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>{group.description}</Text>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {group && currentUser && group.created_by === currentUser.id && (
            <>
              <TouchableOpacity style={styles.headerAction} onPress={openEditModal}>
                <Icon name="pencil-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerAction} onPress={handleDeleteGroup}>
                <Icon name="trash-can-outline" size={24} color="#EF5350" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.headerAction} onPress={() => setMemModalVisible(true)}>
            <Icon name="account-plus" size={24} color={themeColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* SETTLEMENT CARD (US-20 RECONCILIATION) */}
        {settlementInfo && settlementInfo.settlements.length > 0 && (
          <View style={[styles.settleCard, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.settleTitle, { color: colors.text }]}>Divisão de Contas</Text>
              <TouchableOpacity style={[styles.settleBtn, { backgroundColor: themeColor }]} onPress={handleSettleGroup}>
                <Text style={styles.settleBtnText}>Liquidar Tudo</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            {settlementInfo.settlements.map((s, idx) => (
              <View key={idx} style={styles.settleRow}>
                <Icon name="arrow-right-bold-circle-outline" size={20} color="#E65100" />
                <Text style={[styles.settleText, { color: colors.text, flex: 1, marginLeft: 8 }]}>
                  <Text style={{ fontWeight: 'bold' }}>{s.from_name}</Text> deve pagar{' '}
                  <Text style={{ fontWeight: 'bold', color: themeColor }}>{formatCurrency(s.value)}</Text> para{' '}
                  <Text style={{ fontWeight: 'bold' }}>{s.to_name}</Text>
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* SUMMARY CARD */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryItem}>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>TOTAL DO GRUPO</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
              {formatCurrency(settlementInfo?.total_expenses || 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>POR PESSOA</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
              {formatCurrency(settlementInfo?.share_per_member || 0)}
            </Text>
          </View>
        </View>

        {/* ACTIONS */}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: themeColor }]}
          onPress={() => setExpModalVisible(true)}
        >
          <Icon name="plus" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Adicionar Despesa</Text>
        </TouchableOpacity>

        {/* EXPENSES LIST */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Histórico de Despesas</Text>
        {group.expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="cash-multiple" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma despesa adicionada ainda.</Text>
          </View>
        ) : (
          group.expenses.map((e) => (
            <View key={e.id} style={[styles.expenseCard, { backgroundColor: colors.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.expenseDesc, { color: colors.text, textDecorationLine: e.is_settled ? 'line-through' : 'none' }]}>
                  {e.description}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Pago por: {e.paid_by?.name || 'Membro'} • {formatDate(e.date)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>
                  {formatCurrency(e.value)}
                </Text>
                {e.is_settled && (
                  <View style={styles.settledBadge}>
                    <Text style={styles.settledBadgeText}>Liquidada</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ADD EXPENSE MODAL */}
      <Modal visible={expModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nova Despesa no Grupo</Text>
              <TouchableOpacity onPress={() => setExpModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.inputBg, borderColor: colors.border, marginBottom: 15 }]}
              onPress={() => setCategoryModalVisible(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                {expCategoryId && (
                  <>
                    {(() => {
                      const selectedCat = categories.find(c => c.id === expCategoryId);
                      return selectedCat ? (
                        <Icon
                          name={getCategoryIcon(selectedCat)}
                          size={24}
                          color={getCategoryColor(selectedCat)}
                        />
                      ) : null;
                    })()}
                  </>
                )}
                <Text style={{ color: expCategoryId ? colors.inputText : colors.placeholder, flex: 1 }}>
                  {expCategoryId ? categories.find(c => c.id === expCategoryId)?.name : 'Selecione a Categoria *'}
                </Text>
              </View>
              <Icon name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              placeholder="VALOR * (R$)"
              keyboardType="numeric"
              value={expValue}
              onChangeText={handleExpValueChange}
              placeholderTextColor={colors.placeholder}
            />

            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setPaidByModalVisible(true)}
            >
              <Text style={{ color: colors.text }}>
                {selectedPaidMember ? `Pago por: ${selectedPaidMember.name}` : 'Quem pagou?'}
              </Text>
              <Icon name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: themeColor, marginTop: 20 }]}
              onPress={handleAddExpense}
            >
              <Text style={styles.saveBtnText}>Salvar Despesa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CATEGORY SELECTION MODAL */}
      <Modal visible={categoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, height: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar Categoria</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.memberSelectItem}
                  onPress={() => { setExpCategoryId(item.id); setCategoryModalVisible(false); }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name={getCategoryIcon(item)} size={24} color={getCategoryColor(item)} />
                    <Text style={{ fontSize: 16, color: colors.text }}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MEMBER SELECTION MODAL */}
      <Modal visible={paidByModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, height: '40%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Selecione quem pagou</Text>
              <TouchableOpacity onPress={() => setPaidByModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={group.members}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.memberSelectItem}
                  onPress={() => { setExpPaidBy(item.id); setPaidByModalVisible(false); }}
                >
                  <Text style={{ fontSize: 16, color: colors.text }}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ADD MEMBER MODAL */}
      <Modal visible={memModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Adicionar Membro</Text>
              <TouchableOpacity onPress={() => setMemModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              placeholder="E-MAIL (OBRIGATÓRIO)"
              value={memEmail}
              onChangeText={setMemEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.placeholder}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: themeColor, marginTop: 10 }]}
              onPress={handleAddMember}
            >
              <Text style={styles.saveBtnText}>Adicionar Amigo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT GROUP MODAL */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Grupo</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              placeholder="Nome do Grupo"
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor={colors.placeholder}
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              placeholder="Descrição (Opcional)"
              value={editDesc}
              onChangeText={setEditDesc}
              placeholderTextColor={colors.placeholder}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: themeColor, marginTop: 10 }]}
              onPress={handleUpdateGroup}
            >
              <Text style={styles.saveBtnText}>Salvar Alterações</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  backButton: { marginLeft: -10, padding: 5 },
  screenTitle: { fontSize: 28, fontWeight: '900' },
  headerAction: { padding: 5 },
  settleCard: { borderRadius: 24, padding: 18, elevation: 3, marginBottom: 20, marginTop: 10 },
  settleTitle: { fontSize: 15, fontWeight: 'bold' },
  settleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  settleBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 12 },
  settleRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  settleText: { fontSize: 13, lineHeight: 18 },
  summaryCard: { flexDirection: 'row', borderRadius: 24, padding: 20, elevation: 2, marginBottom: 24, justifyContent: 'space-between' },
  summaryItem: { flex: 1 },
  addBtn: { flexDirection: 'row', padding: 18, borderRadius: 24, justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 2, marginBottom: 24 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyContainer: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 14 },
  expenseCard: { borderRadius: 24, padding: 20, marginBottom: 12, elevation: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expenseDesc: { fontSize: 16, fontWeight: 'bold' },
  settledBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6, alignSelf: 'flex-end' },
  settledBadgeText: { color: '#2E7D32', fontSize: 11, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  input: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 15, fontSize: 14, fontWeight: 'bold' },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1 },
  saveBtn: { padding: 20, borderRadius: 24, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  memberSelectItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#EEE' }
});
