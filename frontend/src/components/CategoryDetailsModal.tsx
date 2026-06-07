import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { transactionService, Transaction } from '../services/transactionService';
import { notificationService } from '../services/notificationService';
import { formatCurrency } from '../utils/helpers';

interface CategoryDetailsModalProps {
  visible: boolean;
  categoryId: number;
  categoryName: string;
  isDefault?: boolean;
  budgetLimit?: number;
  onClose: () => void;
  onDelete?: () => void;
  onDeleteCategory?: () => void;
}

export const CategoryDetailsModal: React.FC<CategoryDetailsModalProps> = ({
  visible,
  categoryId,
  categoryName,
  isDefault = false,
  budgetLimit: initialLimit,
  onClose,
  onDelete,
  onDeleteCategory,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLimit, setNewLimit] = useState(initialLimit?.toString() || '');
  const [saving, setSaving] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    setNewLimit(initialLimit?.toString() || '');
  }, [initialLimit]);

  useEffect(() => {
    if (visible && categoryId) {
      loadTransactions();
    }
  }, [visible, categoryId]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getTransactionsByCategory(categoryId);
      setTransactions(data);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as transações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLimit = async () => {
    try {
      setSaving(true);
      await transactionService.updateCategory(categoryId, { budget_limit: newLimit ? parseFloat(newLimit) : undefined });
      Alert.alert('Sucesso', 'Limite de gastos atualizado!');
      onDelete?.(); // Gatilho para atualizar a home
    } catch (error) {
      console.error('Erro ao atualizar limite:', error);
      Alert.alert('Erro', 'Não foi possível salvar o limite.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = (transactionId: number, description: string) => {
    Alert.alert(
      'Deletar transação?',
      `Tem certeza que deseja deletar "${description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancelar notificações locais antes de deletar
              await notificationService.cancelReminderForTransaction(transactionId);
              await transactionService.deleteTransaction(transactionId);
              Alert.alert('Sucesso', 'Transação deletada');
              loadTransactions();
              onDelete?.();
            } catch (error) {
              console.error('Erro ao deletar:', error);
              Alert.alert('Erro', 'Não foi possível deletar a transação');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllTransactions = () => {
    Alert.alert(
      'Limpar categoria?',
      'Isso vai deletar todas as transações desta categoria, mas ela continuará disponível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionService.clearCategoryTransactions(categoryId);
              Alert.alert('Sucesso', 'Transações deletadas');
              onDelete?.();
              loadTransactions();
            } catch (error) {
              console.error('Erro ao limpar:', error);
              Alert.alert('Erro', 'Não foi possível limpar as transações');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCategory = () => {
    Alert.alert(
      'Deletar categoria?',
      'Se excluir, transações vinculadas ficarão sem categoria.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              await transactionService.deleteCategory(categoryId);
              Alert.alert('Sucesso', 'Categoria deletada');
              onDeleteCategory?.();
              onClose();
            } catch (error) {
              console.error('Erro ao deletar:', error);
              Alert.alert('Erro', 'Categorias do sistema não podem ser excluídas.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{categoryName}</Text>
          <TouchableOpacity
            onPress={isDefault ? handleDeleteAllTransactions : handleDeleteCategory}
            style={{ opacity: transactions.length === 0 && isDefault ? 0.5 : 1 }}
            disabled={transactions.length === 0 && isDefault}
          >
            <Icon name="delete" size={24} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <View style={[styles.budgetSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.budgetLabel, { color: colors.textMuted }]}>LIMITE DE GASTOS MENSAL</Text>
            <View style={styles.budgetInputRow}>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Text style={{ color: colors.textMuted, marginRight: 5 }}>R$</Text>
                    <TextInput
                        style={[styles.budgetInput, { color: colors.text }]}
                        keyboardType="numeric"
                        placeholder="Ex: 500.00"
                        placeholderTextColor={colors.placeholder}
                        value={newLimit}
                        onChangeText={setNewLimit}
                    />
                </View>
                <TouchableOpacity 
                    style={[styles.saveLimitBtn, { backgroundColor: colors.accent }]} 
                    onPress={handleSaveLimit}
                    disabled={saving}
                >
                    {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveLimitBtnText}>Salvar</Text>}
                </TouchableOpacity>
            </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF8C00" />
          </View>
        ) : transactions.length > 0 ? (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[styles.transactionItem, { backgroundColor: colors.surface, borderLeftColor: colors.accent }]}>
                <View style={styles.transactionInfo}>
                  <View>
                    <Text style={[styles.description, { color: colors.text }]}>{item.description}</Text>
                    <Text style={[styles.date, { color: colors.textMuted }]}>{formatDate(item.date)}</Text>
                  </View>
                  <Text style={[styles.value, { color: colors.text }]}>{formatCurrency(item.value)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteTransaction(item.id, item.description || 'Sem descrição')}
                  style={styles.deleteBtn}
                >
                  <Icon name="delete" size={20} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.centerContainer}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma transação nesta categoria</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  transactionItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  transactionInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 12,
  },
  description: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  budgetSection: { padding: 20, borderBottomWidth: 1 },
  budgetLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 10 },
  budgetInputRow: { flexDirection: 'row', gap: 10 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 12, borderWidth: 1 },
  budgetInput: { flex: 1, height: 44, fontSize: 16, fontWeight: 'bold' },
  saveLimitBtn: { paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },
  saveLimitBtnText: { color: '#FFF', fontWeight: 'bold' },
});
