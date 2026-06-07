import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { transactionService, Account } from '../services/transactionService';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/helpers';

const ACCOUNT_TYPES = ['Corrente', 'Poupança', 'Carteira', 'Investimento', 'Outros'];

export const AccountsScreen: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('Corrente');
  const [initialBalance, setInitialBalance] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!name || !initialBalance) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      setSaving(true);
      const accountData = {
        name,
        type,
        initial_balance: parseFloat(initialBalance),
      };

      if (editingAccountId) {
        await transactionService.updateAccount(editingAccountId, accountData);
        Alert.alert('Sucesso', 'Conta atualizada!');
      } else {
        await transactionService.createAccount(accountData);
        Alert.alert('Sucesso', 'Conta cadastrada!');
      }
      
      setModalVisible(false);
      resetForm();
      loadAccounts();
    } catch (error) {
      Alert.alert('Erro', `Não foi possível ${editingAccountId ? 'atualizar' : 'cadastrar'} a conta.`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccountId(account.id);
    setName(account.name);
    setType(account.type);
    setInitialBalance(account.initial_balance.toString());
    setModalVisible(true);
  };

  const handleDeleteAccount = (id: number) => {
    const performDelete = async () => {
      try {
        await transactionService.deleteAccount(id);
        loadAccounts();
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível excluir a conta. Verifique se há transações vinculadas.');
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Deseja realmente remover esta conta?');
      if (confirmed) performDelete();
    } else {
      Alert.alert('Excluir Conta', 'Deseja realmente remover esta conta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  const resetForm = () => {
    setName('');
    setType('Corrente');
    setInitialBalance('');
    setEditingAccountId(null);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'Corrente': return 'bank';
      case 'Poupança': return 'piggy-bank';
      case 'Carteira': return 'wallet';
      case 'Investimento': return 'chart-line';
      default: return 'cash-multiple';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Minhas Contas</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={() => setModalVisible(true)}
        >
          <Icon name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Icon name={getAccountIcon(item.type) as any} size={24} color={colors.accent} />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => handleEditAccount(item)}>
                    <Icon name="pencil-outline" size={20} color={colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteAccount(item.id)}>
                    <Icon name="trash-can-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.cardType, { color: colors.textMuted }]}>{item.type}</Text>
              <View style={styles.cardInfo}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>SALDO ATUAL</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatCurrency(item.current_balance || 0)}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="bank-off-outline" size={60} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma conta cadastrada</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingAccountId ? 'Editar Conta' : 'Nova Conta'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>NOME DA CONTA</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="Insira o nome da conta"
                  placeholderTextColor={colors.placeholder}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>TIPO</Text>
                <View style={styles.typeRow}>
                  {ACCOUNT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeOption,
                        { borderColor: colors.border },
                        type === t && { backgroundColor: colors.accent, borderColor: colors.accent }
                      ]}
                      onPress={() => setType(t)}
                    >
                      <Text style={[styles.typeText, { color: colors.text }, type === t && { color: '#FFF' }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>SALDO INICIAL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={colors.placeholder}
                  value={initialBalance}
                  onChangeText={setInitialBalance}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                onPress={handleSaveAccount}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingAccountId ? 'Salvar Alterações' : 'Criar Conta'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: 'bold' },
  addBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 24 },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardName: { fontSize: 20, fontWeight: 'bold' },
  cardType: { fontSize: 13, marginBottom: 16 },
  cardInfo: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16 },
  infoLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  infoValue: { fontSize: 22, fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 8 },
  input: { height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeText: { fontSize: 12, fontWeight: '600' },
  saveBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
