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
import { transactionService, CreditCard } from '../services/transactionService';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/helpers';

export const CreditCardsScreen: React.FC = () => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();

  // Form states
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCardId, setEditingCardId] = useState<number | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getCreditCards();
      setCards(data);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async () => {
    if (!name || !limit || !closingDay || !dueDay) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      setSaving(true);
      const cardData = {
        name,
        limit: parseFloat(limit),
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
      };

      if (editingCardId) {
        await transactionService.updateCreditCard(editingCardId, cardData);
        Alert.alert('Sucesso', 'Cartão atualizado!');
      } else {
        await transactionService.createCreditCard(cardData);
        Alert.alert('Sucesso', 'Cartão cadastrado!');
      }
      
      setModalVisible(false);
      resetForm();
      loadCards();
    } catch (error) {
      Alert.alert('Erro', `Não foi possível ${editingCardId ? 'atualizar' : 'cadastrar'} o cartão.`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCardId(card.id);
    setName(card.name);
    setLimit(card.limit.toString());
    setClosingDay(card.closing_day.toString());
    setDueDay(card.due_day.toString());
    setModalVisible(true);
  };

  const handleDeleteCard = (id: number) => {
    const performDelete = async () => {
      try {
        await transactionService.deleteCreditCard(id);
        loadCards();
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível excluir o cartão.');
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Deseja realmente remover este cartão?');
      if (confirmed) performDelete();
    } else {
      Alert.alert('Excluir Cartão', 'Deseja realmente remover este cartão?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  const resetForm = () => {
    setName('');
    setLimit('');
    setClosingDay('');
    setDueDay('');
    setEditingCardId(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Meus Cartões</Text>
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
          data={cards}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Icon name="credit-card" size={24} color={colors.accent} />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => handleEditCard(item)}>
                    <Icon name="pencil-outline" size={20} color={colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteCard(item.id)}>
                    <Icon name="trash-can-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
              <View style={styles.cardInfo}>
                <View>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>LIMITE</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(item.limit)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>VENCIMENTO</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>Dia {item.due_day}</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="credit-card-off-outline" size={60} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhum cartão cadastrado</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingCardId ? 'Editar Cartão' : 'Novo Cartão'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>NOME DO CARTÃO</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="Insira o nome do cartão"
                  placeholderTextColor={colors.placeholder}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>LIMITE TOTAL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={colors.placeholder}
                  value={limit}
                  onChangeText={setLimit}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>FECHAMENTO</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="Dia"
                    keyboardType="numeric"
                    placeholderTextColor={colors.placeholder}
                    value={closingDay}
                    onChangeText={setClosingDay}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>VENCIMENTO</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="Dia"
                    keyboardType="numeric"
                    placeholderTextColor={colors.placeholder}
                    value={dueDay}
                    onChangeText={setDueDay}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                onPress={handleSaveCard}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingCardId ? 'Salvar Alterações' : 'Cadastrar'}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardName: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  cardInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: 'bold' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 8 },
  input: { height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  row: { flexDirection: 'row', gap: 16 },
  saveBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
