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
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

interface UserData {
  id: number;
  full_name: string;
  email: string;
  financial_profile?: {
    monthly_income: number;
    bill_due_date: string;
    financial_goals: string;
  };
}

export const ProfileScreen = () => {
  const { colors } = useContext(ThemeContext);
  const { logout, user: authUser } = useContext(AuthContext);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [editIncome, setEditIncome] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editGoals, setEditGoals] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/auth/me');
      setUserData(response.data);
      setEditName(response.data.full_name || '');
      setEditEmail(response.data.email);

      // Carregar dados financeiros para edição
      if (response.data.financial_profile) {
        setEditIncome(response.data.financial_profile.monthly_income.toString());
        setEditDueDate(response.data.financial_profile.bill_due_date);
        setEditGoals(response.data.financial_profile.financial_goals);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFinanceProfile = async () => {
    if (!editIncome || !editDueDate) {
      Alert.alert('Erro', 'Renda e Data de Vencimento são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      await api.put('/api/financial-profile', {
        monthly_income: parseFloat(editIncome),
        bill_due_date: editDueDate,
        financial_goals: editGoals,
      });

      Alert.alert('Sucesso', 'Perfil financeiro atualizado!');
      setShowFinanceModal(false);
      loadUserData();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível atualizar o perfil financeiro');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    try {
      setSaving(true);
      await api.put('/api/auth/me', {
        full_name: editName,
        email: editEmail,
      });

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      setShowEditModal(false);
      loadUserData();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível atualizar o perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Erro', 'A nova senha deve ter no mínimo 8 caracteres');
      return;
    }

    try {
      setChangingPassword(true);
      await api.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível alterar a senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCloudBackup = async () => {
    Alert.alert(
      'Backup na Nuvem',
      'Deseja salvar ou restaurar seus dados criptografados do Firebase Storage?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          onPress: async () => {
            try {
              const res = await api.post('/api/backup/cloud-restore');
              Alert.alert('Sucesso', res.data.message);
              loadUserData();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.detail || 'Não foi possível restaurar');
            }
          },
        },
        {
          text: 'Salvar (Sync)',
          onPress: async () => {
            try {
              const res = await api.post('/api/backup/cloud-sync');
              Alert.alert('Sincronizado', res.data.message);
            } catch (error: any) {
              Alert.alert('Erro', 'Não foi possível realizar o backup na nuvem');
            }
          },
        },
      ]
    );
  };

  const handleDeactivateAccount = () => {
    Alert.alert(
      'Desativar Conta',
      'Sua conta será temporariamente desativada. Você poderá reativá-la a qualquer momento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/api/auth/deactivate');
              Alert.alert('Conta Desativada', 'Sua conta foi desativada com sucesso.');
              await logout();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível desativar a conta');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Deletar Conta',
      'Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/auth/delete');
              Alert.alert('Conta Deletada', 'Sua conta foi permanentemente removida.');
              await logout();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível deletar a conta');
            }
          },
        },
      ]
    );
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
        <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Card de Perfil */}
        <View style={[styles.profileCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accentLight }]}>
            <Icon name="account-circle" size={48} color={colors.accent} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {userData?.full_name || 'Usuário Liso'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{userData?.email}</Text>
          </View>
        </View>

        {/* Informações Financeiras (Integradas) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Perfil Financeiro</Text>
            <TouchableOpacity onPress={() => setShowFinanceModal(true)}>
              <Icon name="pencil" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>RENDA MENSAL</Text>
              <Text style={[styles.infoValue, { color: colors.accent }]}>
                R$ {userData?.financial_profile?.monthly_income?.toFixed(2) || '0.00'}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>VENCIMENTO DE CONTAS</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                Dia {userData?.financial_profile?.bill_due_date || '--'}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>OBJETIVO</Text>
              <Text style={[styles.infoValue, { color: colors.text, fontSize: 12 }]}>
                {userData?.financial_profile?.financial_goals || 'Não definido'}
              </Text>
            </View>
          </View>
        </View>

        {/* Ações */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Configurações de Conta</Text>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowEditModal(true)}
          >
            <Icon name="pencil" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Editar Perfil</Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Nome e email</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowPasswordModal(true)}
          >
            <Icon name="lock" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Mudar Senha</Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Atualize sua senha</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={handleCloudBackup}
          >
            <Icon name="cloud-upload" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Backup na Nuvem</Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Sincronizar dados</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={handleDeactivateAccount}
          >
            <Icon name="pause-circle" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Desativar Conta</Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Temporariamente desativar</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={handleDeleteAccount}
          >
            <Icon name="trash-can" size={20} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Deletar Conta</Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>Permanentemente remover</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Editar Perfil */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Perfil</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.formContent}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>NOME</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                  placeholder="Seu nome completo"
                  placeholderTextColor={colors.placeholder}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="email-address"
                  value={editEmail}
                  onChangeText={setEditEmail}
                />
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  onPress={handleUpdateProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Editar Perfil Financeiro */}
      <Modal visible={showFinanceModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowFinanceModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Dados Financeiros</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.formContent}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>RENDA MENSAL</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={colors.placeholder}
                  value={editIncome}
                  onChangeText={setEditIncome}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>DATA VENCIMENTO CONTAS (DIA)</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                  placeholder="Insira o dia de vencimento (1 a 31)"
                  keyboardType="numeric"
                  placeholderTextColor={colors.placeholder}
                  value={editDueDate}
                  onChangeText={setEditDueDate}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>OBJETIVOS FINANCEIROS</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text, height: 80 }]}
                  placeholder="Insira seus objetivos financeiros"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  value={editGoals}
                  onChangeText={setEditGoals}
                />
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowFinanceModal(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  onPress={handleUpdateFinanceProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Mudar Senha */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Mudar Senha</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.formContent}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>SENHA ATUAL</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                  placeholder="Digite sua senha atual"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>NOVA SENHA</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                  placeholder="Digite a nova senha"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textMuted }]}>CONFIRMAR SENHA</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.text }]}
                  placeholder="Confirme a nova senha"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowPasswordModal(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.accent }]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Atualizar</Text>
                  )}
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: { fontSize: 28, fontWeight: 'bold' },

  content: { flex: 1, padding: 24 },

  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold' },
  profileEmail: { fontSize: 12, marginTop: 4 },

  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12, letterSpacing: 0.5 },

  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: 12 },

  actionButton: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  actionLabel: { fontSize: 14, fontWeight: '600' },
  actionDesc: { fontSize: 12, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  formContent: { paddingHorizontal: 24 },

  formGroup: { marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 1 },
  input: { borderRadius: 16, borderWidth: 1, padding: 16, fontSize: 16, height: 56 },

  buttonGroup: { flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 24 },
  cancelBtn: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold' },
  saveBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
