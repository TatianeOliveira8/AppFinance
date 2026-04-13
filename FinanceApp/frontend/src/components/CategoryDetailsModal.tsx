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
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { transactionService, Transaction } from '../services/transactionService';
import { formatCurrency } from '../utils/helpers';

interface CategoryDetailsModalProps {
  visible: boolean;
  categoryId: number;
  categoryName: string;
  onClose: () => void;
  onDelete?: () => void;
}

export const CategoryDetailsModal: React.FC<CategoryDetailsModalProps> = ({
  visible,
  categoryId,
  categoryName,
  onClose,
  onDelete,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleDelete = (transactionId: number, description: string) => {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>{categoryName}</Text>
          <View style={{ width: 24 }} />
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
              <View style={styles.transactionItem}>
                <View style={styles.transactionInfo}>
                  <View>
                    <Text style={styles.description}>{item.description}</Text>
                    <Text style={styles.date}>{formatDate(item.date)}</Text>
                  </View>
                  <Text style={styles.value}>{formatCurrency(item.value)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.description || 'Sem descrição')}
                  style={styles.deleteBtn}
                >
                  <Icon name="delete" size={20} color="#E53935" />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Nenhuma transação nesta categoria</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
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
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C00',
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
    color: '#1A1A1A',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  deleteBtn: {
    padding: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});
