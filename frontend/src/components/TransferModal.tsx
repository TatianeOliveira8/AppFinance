import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { transactionService, Account } from '../services/transactionService';
import { formatCurrency } from '../utils/helpers';

interface TransferModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  onClose,
  onSuccess,
  accounts,
}) => {
  const [fromAccount, setFromAccount] = useState<Account | null>(null);
  const [toAccount, setToAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    if (visible && accounts.length > 0) {
      setFromAccount(accounts[0]);
      setToAccount(accounts.length > 1 ? accounts[1] : null);
    }
  }, [visible, accounts]);

  const handleTransfer = async () => {
    if (!fromAccount || !toAccount) {
      Alert.alert('Erro', 'Selecione as contas de origem e destino');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }

    if (fromAccount.id === toAccount.id) {
      Alert.alert('Erro', 'Não é possível transferir para a mesma conta');
      return;
    }

    const fromBalance = fromAccount.current_balance || 0;
    if (fromBalance < transferAmount) {
      Alert.alert('Erro', `Saldo insuficiente. Disponível: R$ ${fromBalance.toFixed(2)}`);
      return;
    }

    try {
      setLoading(true);
      await transactionService.transferBetweenAccounts({
        from_account_id: fromAccount.id,
        to_account_id: toAccount.id,
        value: transferAmount,
        description: description || undefined,
      });

      Alert.alert('Sucesso', `Transferência de R$ ${transferAmount.toFixed(2)} realizada!`);
      setAmount('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao transferir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>🔄 Transferência</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* CONTA DE ORIGEM */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textMuted }]}>De qual conta?</Text>
              <TouchableOpacity
                style={[styles.accountButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => setShowFromPicker(!showFromPicker)}
              >
                <View style={[styles.accountIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Icon name="bank" size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accountName, { color: colors.text }]}>
                    {fromAccount?.name || 'Selecione'}
                  </Text>
                  {fromAccount && (
                    <Text style={[styles.accountBalance, { color: colors.textMuted }]}>
                      Saldo: {formatCurrency(fromAccount.current_balance || 0)}
                    </Text>
                  )}
                </View>
                <Icon
                  name={showFromPicker ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {showFromPicker && (
                <View style={[styles.picker, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  {accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.pickerItem,
                        fromAccount?.id === acc.id && { backgroundColor: colors.accent + '20' },
                      ]}
                      onPress={() => {
                        setFromAccount(acc);
                        setShowFromPicker(false);
                      }}
                    >
                      <View style={[styles.pickerIcon, { backgroundColor: colors.accent + '30' }]}>
                        <Icon name="bank" size={18} color={colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerName, { color: colors.text }]}>{acc.name}</Text>
                        <Text style={[styles.pickerBalance, { color: colors.textMuted }]}>
                          {formatCurrency(acc.current_balance || 0)}
                        </Text>
                      </View>
                      {fromAccount?.id === acc.id && (
                        <Icon name="check" size={20} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* SETA TRANSFERÊNCIA */}
            <View style={styles.arrowContainer}>
              <Icon name="arrow-down" size={28} color={colors.accent} />
            </View>

            {/* CONTA DE DESTINO */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Para qual conta?</Text>
              <TouchableOpacity
                style={[styles.accountButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => setShowToPicker(!showToPicker)}
              >
                <View style={[styles.accountIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Icon name="bank" size={20} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accountName, { color: colors.text }]}>
                    {toAccount?.name || 'Selecione'}
                  </Text>
                  {toAccount && (
                    <Text style={[styles.accountBalance, { color: colors.textMuted }]}>
                      Saldo: {formatCurrency(toAccount.current_balance || 0)}
                    </Text>
                  )}
                </View>
                <Icon
                  name={showToPicker ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {showToPicker && (
                <View style={[styles.picker, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  {accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.pickerItem,
                        toAccount?.id === acc.id && { backgroundColor: colors.accent + '20' },
                      ]}
                      onPress={() => {
                        setToAccount(acc);
                        setShowToPicker(false);
                      }}
                    >
                      <View style={[styles.pickerIcon, { backgroundColor: colors.accent + '30' }]}>
                        <Icon name="bank" size={18} color={colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerName, { color: colors.text }]}>{acc.name}</Text>
                        <Text style={[styles.pickerBalance, { color: colors.textMuted }]}>
                          {formatCurrency(acc.current_balance || 0)}
                        </Text>
                      </View>
                      {toAccount?.id === acc.id && (
                        <Icon name="check" size={20} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* VALOR */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Quanto transferir?</Text>
              <View style={[styles.amountInput, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.currencySymbol, { color: colors.accent }]}>R$</Text>
                <TextInput
                  style={[styles.amountField, { color: colors.inputText }]}
                  placeholder="0,00"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  editable={!loading}
                />
              </View>
            </View>

            {/* DESCRIÇÃO (OPCIONAL) */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.descriptionInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                placeholder="Ex: Ajuste de saldo"
                placeholderTextColor={colors.placeholder}
                value={description}
                onChangeText={setDescription}
                editable={!loading}
              />
            </View>

            {/* BUTTONS */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent }, loading && { opacity: 0.6 }]}
                onPress={handleTransfer}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={[styles.buttonText, { color: '#FFF' }]}>Transferir</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 12,
    fontWeight: '500',
  },
  picker: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  pickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  pickerBalance: {
    fontSize: 11,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
  },
  amountField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  descriptionInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
