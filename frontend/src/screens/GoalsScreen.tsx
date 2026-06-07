import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { goalsService, SavingsGoal } from '../services/goalsService';
import { formatCurrency } from '../utils/helpers';

export const GoalsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressAmount, setProgressAmount] = useState('');
  const [selectedGoalForProgress, setSelectedGoalForProgress] = useState<SavingsGoal | null>(null);
  const { colors } = useTheme();

  // Form states
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentProgress, setCurrentProgress] = useState('');
  const [deadline, setDeadline] = useState(new Date());
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [])
  );

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await goalsService.getGoals();
      setGoals(data);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      Alert.alert('Erro', 'Não foi possível carregar suas metas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  };

  const handleOpenForm = (goal?: SavingsGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setName(goal.name);
      setTargetValue(goal.target_value.toString());
      setCurrentProgress(goal.current_progress.toString());
      setDeadline(new Date(goal.deadline));
      setDescription(goal.description || '');
    } else {
      setEditingGoal(null);
      setName('');
      setTargetValue('');
      setCurrentProgress('0');
      setDeadline(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 dias no futuro
      setDescription('');
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingGoal(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite um nome para a meta');
      return;
    }

    const target = parseFloat(targetValue);
    if (!target || target <= 0) {
      Alert.alert('Erro', 'Informe um valor válido maior que 0');
      return;
    }

    const progress = parseFloat(currentProgress) || 0;
    if (progress < 0) {
      Alert.alert('Erro', 'O progresso não pode ser negativo');
      return;
    }

    if (deadline <= new Date()) {
      Alert.alert('Erro', 'A data limite deve ser no futuro');
      return;
    }

    try {
      if (editingGoal) {
        await goalsService.updateGoal(editingGoal.id, {
          name,
          target_value: target,
          current_progress: progress,
          deadline: deadline.toISOString(),
          description: description || undefined,
        });
        Alert.alert('Sucesso', 'Meta atualizada!');
      } else {
        await goalsService.createGoal({
          name,
          target_value: target,
          deadline: deadline.toISOString(),
          description: description || undefined,
          current_progress: progress,
        });
        Alert.alert('Sucesso', 'Meta criada!');
      }
      await loadGoals();
      handleCloseForm();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao salvar meta');
    }
  };

  const handleDelete = (goal: SavingsGoal) => {
    Alert.alert('Confirmar', `Deseja deletar a meta "${goal.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: async () => {
          try {
            await goalsService.deleteGoal(goal.id);
            Alert.alert('Sucesso', 'Meta deletada!');
            await loadGoals();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível deletar a meta');
          }
        },
      },
    ]);
  };

  const handleAddProgress = (goal: SavingsGoal) => {
    setSelectedGoalForProgress(goal);
    setProgressAmount('');
    setShowProgressModal(true);
  };

  const handleSubmitProgress = async () => {
    if (!selectedGoalForProgress) return;
    const amount = parseFloat(progressAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erro', 'Informe um valor válido');
      return;
    }
    try {
      await goalsService.updateGoalProgress(selectedGoalForProgress.id, amount);
      await loadGoals();
      Alert.alert('Sucesso', `R$ ${amount.toFixed(2)} adicionado!`);
      setShowProgressModal(false);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o progresso');
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
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={[styles.title, { color: colors.text }]}>Metas de Economia</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
          onPress={() => handleOpenForm()}
        >
          <Icon name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {goals.length > 0 ? (
          goals.map((goal) => {
            const monthsRemaining = goalsService.getMonthsRemaining(goal.deadline);
            const monthlyTarget = goalsService.getMonthlyTarget(goal.target_value, goal.deadline);
            const progressPercentage = goalsService.getProgressPercentage(
              goal.current_progress,
              goal.target_value
            );
            const isDeadlineExceeded = goalsService.isDeadlineExceeded(goal.deadline);
            const remaining = goal.target_value - goal.current_progress;

            return (
              <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.goalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={[styles.goalName, { color: colors.text }]}>{goal.name}</Text>
                      {progressPercentage >= 100 && (
                        <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                          <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: 'bold' }}>Concluída! 🎉</Text>
                        </View>
                      )}
                    </View>
                    {goal.description && (
                      <Text style={[styles.goalDescription, { color: colors.textMuted }]} numberOfLines={1}>
                        {goal.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.goalActions}>
                    <TouchableOpacity onPress={() => handleOpenForm(goal)}>
                      <Icon name="pencil" size={20} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(goal)} style={{ marginLeft: 12 }}>
                      <Icon name="trash-can" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* STATS */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Meta</Text>
                    <Text style={[styles.statValue, { color: colors.accent }]}>
                      {formatCurrency(goal.target_value)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Economizado</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {formatCurrency(goal.current_progress)}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Falta</Text>
                    <Text style={[styles.statValue, { color: remaining <= 0 ? colors.accent : colors.danger }]}>
                      {formatCurrency(Math.max(0, remaining))}
                    </Text>
                  </View>
                </View>

                {/* PROGRESS BAR */}
                <View style={styles.progressSection}>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, progressPercentage)}%`,
                          backgroundColor:
                            progressPercentage >= 100
                              ? '#4CAF50'
                              : isDeadlineExceeded
                                ? colors.danger
                                : colors.accent,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: colors.textMuted }]}>
                    {progressPercentage.toFixed(0)}%
                  </Text>
                </View>

                {/* INFO */}
                <View style={styles.infoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>
                      {progressPercentage >= 100 ? 'Status:' : 'Poupar por mês:'}
                    </Text>
                    <Text style={[styles.infoValue, { color: progressPercentage >= 100 ? '#2E7D32' : colors.accent }]}>
                      {progressPercentage >= 100 ? 'Meta Atingida!' : formatCurrency(monthlyTarget)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Prazo:</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: isDeadlineExceeded ? colors.danger : colors.text },
                      ]}
                    >
                      {isDeadlineExceeded ? 'Vencido!' : `${monthsRemaining} ${monthsRemaining === 1 ? 'mês' : 'meses'}`}
                    </Text>
                  </View>
                </View>

                {/* ACTION BUTTON */}
                <TouchableOpacity
                  style={[styles.addProgressBtn, { backgroundColor: colors.accent }]}
                  onPress={() => handleAddProgress(goal)}
                >
                  <Icon name="plus-circle" size={18} color="#FFF" />
                  <Text style={styles.addProgressBtnText}>Adicionar Progresso</Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Icon name="target-variant" size={60} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Nenhuma meta criada</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Crie sua primeira meta de economia
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
              onPress={() => handleOpenForm()}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Criar Meta</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* PROGRESS MODAL */}
      <Modal visible={showProgressModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.formContainer, { backgroundColor: colors.surface, paddingBottom: 20 }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                Adicionar Progresso
              </Text>
              <TouchableOpacity onPress={() => setShowProgressModal(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.formContent}>
              <Text style={[styles.formLabel, { color: colors.textMuted }]}>
                Quanto você quer adicionar à meta "{selectedGoalForProgress?.name}"?
              </Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border, marginBottom: 20 }]}
                placeholder="Digite o valor (R$)"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
                value={progressAmount}
                onChangeText={setProgressAmount}
                autoFocus
              />
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => setShowProgressModal(false)}
                >
                  <Text style={[styles.formBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formBtn, { backgroundColor: colors.accent }]}
                  onPress={handleSubmitProgress}
                >
                  <Text style={[styles.formBtnText, { color: '#FFF' }]}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* FORM MODAL */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.formContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: colors.text }]}>
                {editingGoal ? 'Editar Meta' : 'Nova Meta'}
              </Text>
              <TouchableOpacity onPress={handleCloseForm}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
              {/* Nome */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Nome da Meta</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                  placeholder="Insira o nome desta meta"
                  placeholderTextColor={colors.placeholder}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Valor Alvo */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Valor da Meta</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                  placeholder="Digite o valor total da meta (R$)"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="decimal-pad"
                  value={targetValue}
                  onChangeText={setTargetValue}
                />
              </View>

              {/* Progresso Atual */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Valor Economizado</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
                  placeholder="Digite o valor já guardado (R$)"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="decimal-pad"
                  value={currentProgress}
                  onChangeText={setCurrentProgress}
                />
              </View>

              {/* Data Limite */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Data Limite</Text>
                <TouchableOpacity
                  style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, justifyContent: 'center' }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: colors.inputText }}>
                    {deadline.toLocaleDateString('pt-BR')}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={deadline}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => {
                    if (date) setDeadline(date);
                    setShowDatePicker(false);
                  }}
                />
              )}

              {/* Descrição */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Descrição (Opcional)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border, minHeight: 80 }]}
                  placeholder="Insira observações sobre esta meta (opcional)"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* Buttons */}
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={handleCloseForm}
                >
                  <Text style={[styles.formBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formBtn, { backgroundColor: colors.accent }]}
                  onPress={handleSave}
                >
                  <Text style={[styles.formBtnText, { color: '#FFF' }]}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  goalCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 12,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  addProgressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addProgressBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  emptyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  // FORM STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  formContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  formContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  formBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
