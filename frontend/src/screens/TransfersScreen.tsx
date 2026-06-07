import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '../context/ThemeContext';
import { transactionService } from '../services/transactionService';
import api from '../services/api';

interface Account {
  id: number;
  name: string;
  type: string;
  current_balance: number;
  currency: string;
}

export const TransfersScreen = () => {
  const { colors } = useContext(ThemeContext);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [fromAccount, setFromAccount] = useState<Account | null>(null);
  const [toAccount, setToAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadAccounts();
    }, [])
  );

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/accounts/');
      setAccounts(response.data);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    console.log('Iniciando transferência:', { fromAccount: fromAccount?.id, toAccount: toAccount?.id, amount });

    if (!fromAccount || !toAccount || !amount) {
      Alert.alert('Erro', 'Preencha todos os campos (Contas e Valor)');
      return;
    }

    if (fromAccount.id === toAccount.id) {
      Alert.alert('Erro', 'A conta de origem e destino devem ser diferentes');
      return;
    }

    const val = parseFloat(amount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      Alert.alert('Erro', 'Insira um valor válido');
      return;
    }

    if (val > (fromAccount.current_balance || 0)) {
      Alert.alert('Erro', `Saldo insuficiente na conta ${fromAccount.name}.`);
      return;
    }

    try {
      setTransferring(true);
      const result = await transactionService.transferBetweenAccounts({
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        value: val,
        description: description || 'Transferência entre contas'
      });

      console.log('Sucesso na transferência:', result);
      
      // 1. Fechar a tela PRIMEIRO para atualizar o visual
      setShowTransfer(false);
      
      // 2. Limpar campos
      setAmount('');
      setDescription('');
      setFromAccount(null);
      setToAccount(null);
      
      // 3. Recarregar dados
      await loadAccounts();

      // 4. Mostrar alerta depois de um micro-delay para não travar a UI
      setTimeout(() => {
        Alert.alert('Sucesso', 'Transferência realizada com sucesso!');
      }, 500);

    } catch (error: any) {
      console.error('Erro na transferência:', error);
      const msg = error.response?.data?.detail || 'Não foi possível realizar a transferência. Verifique sua conexão.';
      Alert.alert('Erro', msg);
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!showTransfer ? (
        <>
          <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
            <Text style={[styles.title, { color: colors.text }]}>Transferências</Text>
          </View>

          <ScrollView style={styles.content}>
            {/* Transferência Rápida */}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.accentLight }]}
                onPress={() => setShowTransfer(true)}
              >
                <Icon name="arrow-left-right" size={28} color={colors.accent} />
                <Text style={[styles.actionText, { color: colors.text }]}>Transferir entre contas</Text>
              </TouchableOpacity>
            </View>

            {/* Minhas Contas */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Minhas Contas</Text>
              {accounts.map((account) => (
                <View
                  key={account.id}
                  style={[styles.accountCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <View style={styles.accountHeader}>
                    <View>
                      <Text style={[styles.accountName, { color: colors.text }]}>{account.name}</Text>
                      <Text style={[styles.accountType, { color: colors.textMuted }]}>
                        {account.type}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.accountBalance}>
                    <Text style={[styles.balanceValue, { color: colors.accent }]}>
                      R$ {(account.current_balance || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      ) : (
        <>
          <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
            <TouchableOpacity onPress={() => setShowTransfer(false)}>
              <Icon name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Transferência</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.formContent}>
            {/* De */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>DE (CONTA ORIGEM)</Text>
              <TouchableOpacity
                style={[styles.accountSelector, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
                onPress={() => setShowFromPicker(!showFromPicker)}
              >
                {fromAccount ? (
                  <View>
                    <Text style={[styles.selectorText, { color: colors.text }]}>{fromAccount.name}</Text>
                    <Text style={[styles.selectorSubtext, { color: colors.textMuted }]}>
                      Saldo: R$ {(fromAccount.current_balance || 0).toFixed(2)}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.selectorText, { color: colors.placeholder }]}>Selecione uma conta</Text>
                )}
                <Icon name={showFromPicker ? 'chevron-up' : 'chevron-down'} size={24} color={colors.textMuted} />
              </TouchableOpacity>

              {showFromPicker && (
                <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {accounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setFromAccount(account);
                        setShowFromPicker(false);
                      }}
                    >
                      <View>
                        <Text style={[styles.dropdownText, { color: colors.text }]}>{account.name}</Text>
                        <Text style={[styles.dropdownSubtext, { color: colors.textMuted }]}>
                          R$ {(account.current_balance || 0).toFixed(2)}
                        </Text>
                      </View>
                      {fromAccount?.id === account.id && (
                        <Icon name="check" size={20} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Seta */}
            <View style={styles.arrowContainer}>
              <Icon name="arrow-down" size={24} color={colors.accent} />
            </View>

            {/* Para */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>PARA (CONTA DESTINO)</Text>
              <TouchableOpacity
                style={[styles.accountSelector, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
                onPress={() => setShowToPicker(!showToPicker)}
              >
                {toAccount ? (
                  <View>
                    <Text style={[styles.selectorText, { color: colors.text }]}>{toAccount.name}</Text>
                    <Text style={[styles.selectorSubtext, { color: colors.textMuted }]}>
                      Saldo: R$ {(toAccount.current_balance || 0).toFixed(2)}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.selectorText, { color: colors.placeholder }]}>Selecione uma conta</Text>
                )}
                <Icon name={showToPicker ? 'chevron-up' : 'chevron-down'} size={24} color={colors.textMuted} />
              </TouchableOpacity>

              {showToPicker && (
                <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {accounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setToAccount(account);
                        setShowToPicker(false);
                      }}
                    >
                      <View>
                        <Text style={[styles.dropdownText, { color: colors.text }]}>{account.name}</Text>
                        <Text style={[styles.dropdownSubtext, { color: colors.textMuted }]}>
                          R$ {(account.current_balance || 0).toFixed(2)}
                        </Text>
                      </View>
                      {toAccount?.id === account.id && (
                        <Icon name="check" size={20} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Valor */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>VALOR</Text>
              <View style={[styles.amountInput, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
                <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>R$</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* Descrição */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>DESCRIÇÃO (OPCIONAL)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                placeholder="Insira a descrição da transferência"
                placeholderTextColor={colors.placeholder}
                value={description}
                onChangeText={setDescription}
                maxLength={100}
              />
            </View>

            {/* Botões */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowTransfer(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.transferBtn, { backgroundColor: colors.accent }]}
                onPress={handleTransfer}
                disabled={transferring}
              >
                {transferring ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.transferBtnText}>Transferir</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  content: { flex: 1, padding: 24 },
  formContent: { flex: 1, padding: 24 },

  // Ação Rápida
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  actionText: { fontSize: 16, fontWeight: '600' },

  // Seção de Contas
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12, letterSpacing: 0.5 },
  accountCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountHeader: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '600' },
  accountType: { fontSize: 12, marginTop: 4 },
  accountBalance: { alignItems: 'flex-end' },
  balanceValue: { fontSize: 18, fontWeight: 'bold' },

  // Formulário
  formGroup: { marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 1 },
  accountSelector: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: { fontSize: 16, fontWeight: '600' },
  selectorSubtext: { fontSize: 12, marginTop: 4 },

  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  dropdownText: { fontSize: 14, fontWeight: '500' },
  dropdownSubtext: { fontSize: 12, marginTop: 4 },

  arrowContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },

  amountInput: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  currencySymbol: { fontSize: 18, fontWeight: '600', marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },

  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 32,
  },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold' },
  transferBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transferBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
