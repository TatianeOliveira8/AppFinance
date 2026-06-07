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
import { expenseGroupsService, ExpenseGroup } from '../services/expenseGroupsService';
import api from '../services/api';

export default function ExpenseGroupsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const themeColor = colors.accent;

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ExpenseGroup[]>([]);
  
  // Create Group Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [membersList, setMembersList] = useState<{ name: string; email?: string }[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await expenseGroupsService.getGroups();
      setGroups(data);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os grupos de despesas.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemberToList = async () => {
    if (!memberEmail.trim()) {
      Alert.alert('Aviso', 'O e-mail é obrigatório para verificar se o usuário está cadastrado no app.');
      return;
    }
    try {
      const response = await api.get('/api/auth/verify-user?email=' + encodeURIComponent(memberEmail.trim()));
      const userData = response.data;

      // Check if already added
      if (membersList.some(m => m.email?.toLowerCase() === userData.email.toLowerCase())) {
        Alert.alert('Aviso', 'Este participante já foi adicionado.');
        return;
      }

      setMembersList([...membersList, { name: userData.full_name, email: userData.email }]);
      setMemberEmail('');
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || 'Não foi possível encontrar o usuário. Certifique-se de que ele tem o app instalado.';
      Alert.alert('Erro', errorMsg);
    }
  };

  const handleRemoveMemberFromList = (index: number) => {
    setMembersList(membersList.filter((_, i) => i !== index));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Aviso', 'Preencha o nome do grupo.');
      return;
    }
    try {
      await expenseGroupsService.createGroup(groupName.trim(), groupDesc.trim() || undefined, membersList);
      Alert.alert('Sucesso', 'Grupo de despesas criado!');
      setCreateModalVisible(false);
      setGroupName('');
      setGroupDesc('');
      setMembersList([]);
      loadGroups();
    } catch (e: any) {
      const errorMsg = e.response?.data?.detail || 'Não foi possível criar o grupo.';
      Alert.alert('Erro', errorMsg);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={30} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Dividir</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          {groups.length === 0 ? (
            <View style={[styles.emptyContainer, { flex: 1, justifyContent: 'center', marginTop: -50 }]}>
              <Icon name="account-group-outline" size={80} color={colors.textMuted} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyText, { color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 10 }]}>
                Nenhum grupo criado ainda
              </Text>
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginHorizontal: 20, marginBottom: 30 }}>
                Crie grupos para dividir contas de viagens, churrascos ou casa com seus amigos.
              </Text>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: themeColor, width: '100%' }]}
                onPress={() => setCreateModalVisible(true)}
              >
                <Icon name="plus" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>Criar meu primeiro grupo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: themeColor }]}
                onPress={() => setCreateModalVisible(true)}
              >
                <Icon name="plus" size={20} color="#FFF" />
                <Text style={styles.addBtnText}>Criar Novo Grupo</Text>
              </TouchableOpacity>
              <FlatList
                data={groups}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 30 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.groupCard, { backgroundColor: colors.surface }]}
                    onPress={() => navigation.navigate('ExpenseGroupDetails', { groupId: item.id })}
                  >
                    <View style={styles.groupInfo}>
                      <View style={[styles.iconCircle, { backgroundColor: themeColor + '20' }]}>
                        <Icon name="account-group" size={28} color={themeColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.groupName, { color: colors.text }]}>{item.name}</Text>
                        {item.description && (
                          <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
                            {item.description}
                          </Text>
                        )}
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                          {item.members?.length || 0} membros • {item.expenses?.length || 0} despesas
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={24} color={colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </View>
      )}

      {/* CREATE GROUP MODAL */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Novo Grupo</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Icon name="close" size={30} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: '80%' }}>
              <Text style={styles.sectionLabel}>NOME DO GRUPO E DESCRIÇÃO *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                placeholder="Insira o nome deste grupo de despesa"
                value={groupName}
                onChangeText={setGroupName}
                placeholderTextColor={colors.placeholder}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                placeholder="Descrição (Opcional)"
                value={groupDesc}
                onChangeText={setGroupDesc}
                placeholderTextColor={colors.placeholder}
              />

              <Text style={styles.sectionLabel}>ADICIONAR PARTICIPANTES</Text>
              <View style={styles.memberInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1.2, marginBottom: 0, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                  placeholder="E-mail (Obrigatório)"
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.placeholder}
                />
                <TouchableOpacity
                  style={[styles.addMemberBtn, { backgroundColor: themeColor }]}
                  onPress={handleAddMemberToList}
                >
                  <Icon name="plus" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Members List */}
              <View style={styles.membersListContainer}>
                {membersList.map((m, idx) => (
                  <View key={idx} style={[styles.memberTag, { backgroundColor: colors.border }]}>
                    <Text style={{ color: colors.text, fontSize: 13 }}>{m.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveMemberFromList(idx)}>
                      <Icon name="close-circle" size={16} color={colors.textMuted} style={{ marginLeft: 5 }} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: themeColor }]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.saveBtnText}>Criar Grupo</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 20 },
  backButton: { marginLeft: -10 },
  screenTitle: { fontSize: 32, fontWeight: '900', marginTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', padding: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 2, marginBottom: 20, marginTop: 10 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { alignItems: 'center', padding: 50, gap: 15 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  groupCard: { borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2 },
  groupInfo: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  groupName: { fontSize: 16, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold' },
  input: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 15, fontSize: 16 },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#999', marginBottom: 8, marginTop: 10, letterSpacing: 1 },
  memberInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 15 },
  addMemberBtn: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  membersListContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  memberTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  saveBtn: { padding: 22, borderRadius: 24, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
