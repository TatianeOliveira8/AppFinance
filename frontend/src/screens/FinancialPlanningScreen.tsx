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
  FlatList,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import { transactionService } from '../services/transactionService';
import { investmentsService, Investment } from '../services/investmentsService';
import { annualExpensesService, AnnualExpense } from '../services/annualExpensesService';
import { formatDate, formatCurrency } from '../utils/helpers';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function FinancialPlanningScreen({ navigation }: any) {
  const { colors } = useTheme();
  const themeColor = colors.accent;

  const [activeTab, setActiveTab] = useState<'patrimonio' | 'projecao' | 'investimentos' | 'anual'>('patrimonio');
  const [loading, setLoading] = useState(true);

  // States for Net Worth & Projections
  const [netWorth, setNetWorth] = useState<any>(null);
  const [projection, setProjection] = useState<any>(null);

  // States for Investments
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [invModalVisible, setInvModalVisible] = useState(false);
  const [invName, setInvName] = useState('');
  const [invType, setInvType] = useState('CDB');
  const [invValue, setInvValue] = useState('');
  const [invCurrent, setInvCurrent] = useState('');
  const [invRate, setInvRate] = useState('');
  const [invInstitution, setInvInstitution] = useState('');
  const [invNotes, setInvNotes] = useState('');
  const [invDate, setInvDate] = useState(new Date());
  const [showInvDatePicker, setShowInvDatePicker] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const formatToCurrency = (val: string) => {
    let cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) return '';
    let intVal = parseInt(cleanVal);
    return (intVal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // States for Annual Planning
  const [annualExpenses, setAnnualExpenses] = useState<AnnualExpense[]>([]);
  const [aeModalVisible, setAeModalVisible] = useState(false);
  const [aeName, setAeName] = useState('');
  const [aeValue, setAeValue] = useState('');
  const [aeNotes, setAeNotes] = useState('');
  const [aeAlertDays, setAeAlertDays] = useState('30');
  const [aeDate, setAeDate] = useState(new Date());
  const [showAeDatePicker, setShowAeDatePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'patrimonio') {
        const nw = await transactionService.getNetWorth();
        setNetWorth(nw);
      } else if (activeTab === 'projecao') {
        const proj = await transactionService.getBalanceProjection();
        setProjection(proj);
      } else if (activeTab === 'investimentos') {
        const invs = await investmentsService.getInvestments();
        setInvestments(invs);
        const accs = await transactionService.getAccounts();
        setAccounts(accs);
      } else if (activeTab === 'anual') {
        const aes = await annualExpensesService.getAnnualExpenses();
        setAnnualExpenses(aes);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvestment = async () => {
    if (!invName || !invValue || !invCurrent) {
      Alert.alert('Aviso', 'Preencha os campos obrigatórios.');
      return;
    }
    try {
      const cleanInvValue = parseFloat(invValue.replace(/\./g, '').replace(',', '.'));
      const cleanInvCurrent = parseFloat(invCurrent.replace(/\./g, '').replace(',', '.'));

      await investmentsService.createInvestment({
        name: invName,
        type: invType,
        invested_value: cleanInvValue,
        current_value: cleanInvCurrent,
        annual_rate: invRate ? parseFloat(invRate.replace(',', '.')) : undefined,
        institution: invInstitution,
        notes: invNotes,
        start_date: invDate.toISOString(),
        account_id: selectedAccountId || undefined
      });
      Alert.alert('Sucesso', 'Investimento registrado!');
      setInvModalVisible(false);
      resetInvFields();
      loadData();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível registrar o investimento.');
    }
  };

  const resetInvFields = () => {
    setInvName('');
    setInvType('CDB');
    setInvValue('');
    setInvCurrent('');
    setInvRate('');
    setInvInstitution('');
    setInvNotes('');
    setInvDate(new Date());
    setSelectedAccountId(null);
  };

  const handleCreateAnnualExpense = async () => {
    if (!aeName || !aeValue) {
      Alert.alert('Aviso', 'Preencha os campos obrigatórios.');
      return;
    }
    try {
      const cleanAeValue = parseFloat(aeValue.replace(/\./g, '').replace(',', '.'));

      await annualExpensesService.createAnnualExpense({
        name: aeName,
        estimated_value: cleanAeValue,
        due_date: aeDate.toISOString(),
        alert_days_before: parseInt(aeAlertDays) || 30,
        notes: aeNotes,
        is_paid: false
      });
      Alert.alert('Sucesso', 'Despesa anual planejada!');
      setAeModalVisible(false);
      setAeName('');
      setAeValue('');
      setAeNotes('');
      setAeAlertDays('30');
      setAeDate(new Date());
      loadData();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível criar o planejamento.');
    }
  };

  const toggleAePaid = async (expense: AnnualExpense) => {
    try {
      await annualExpensesService.updateAnnualExpense(expense.id, {
        is_paid: !expense.is_paid
      });
      loadData();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível atualizar o status de pagamento.');
    }
  };

  const deleteInvestmentItem = async (id: number) => {
    Alert.alert('Excluir', 'Deseja excluir este investimento?', [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await investmentsService.deleteInvestment(id);
          loadData();
        } catch (e) {
          Alert.alert('Erro', 'Não foi possível excluir.');
        }
      }}
    ]);
  };

  const deleteAnnualExpenseItem = async (id: number) => {
    Alert.alert('Excluir', 'Deseja excluir esta despesa planejada?', [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await annualExpensesService.deleteAnnualExpense(id);
          loadData();
        } catch (e) {
          Alert.alert('Erro', 'Não foi possível excluir.');
        }
      }}
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={30} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Inteligência</Text>
      </View>

      {/* TABS CONTAINER */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'patrimonio' && { backgroundColor: themeColor + '20', borderColor: themeColor }]}
            onPress={() => setActiveTab('patrimonio')}
          >
            <Icon name="chart-donut" size={18} color={activeTab === 'patrimonio' ? themeColor : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === 'patrimonio' ? themeColor : colors.textMuted }]}>Patrimônio Líquido</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'projecao' && { backgroundColor: themeColor + '20', borderColor: themeColor }]}
            onPress={() => setActiveTab('projecao')}
          >
            <Icon name="chart-timeline-variant" size={18} color={activeTab === 'projecao' ? themeColor : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === 'projecao' ? themeColor : colors.textMuted }]}>Projeção de Saldo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'investimentos' && { backgroundColor: themeColor + '20', borderColor: themeColor }]}
            onPress={() => setActiveTab('investimentos')}
          >
            <Icon name="trending-up" size={18} color={activeTab === 'investimentos' ? themeColor : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === 'investimentos' ? themeColor : colors.textMuted }]}>Investimentos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'anual' && { backgroundColor: themeColor + '20', borderColor: themeColor }]}
            onPress={() => setActiveTab('anual')}
          >
            <Icon name="calendar-multiselect" size={18} color={activeTab === 'anual' ? themeColor : colors.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === 'anual' ? themeColor : colors.textMuted }]}>Despesas Anuais</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* CONTENT */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* TAB: PATRIMÔNIO LÍQUIDO (US-25) */}
          {activeTab === 'patrimonio' && netWorth && (
            <View style={styles.sectionContainer}>
              {/* CARD PRINCIPAL */}
              <View style={[styles.netWorthCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>PATRIMÔNIO LÍQUIDO TOTAL</Text>
                <Text style={[styles.netWorthValue, { color: netWorth.net_worth >= 0 ? '#2E7D32' : '#C62828' }]}>
                  {formatCurrency(netWorth.net_worth)}
                </Text>
                <View style={styles.divider} />
                <View style={styles.rowItem}>
                  <View style={styles.rowIconLabel}>
                    <Icon name="plus-circle-outline" size={20} color="#2E7D32" />
                    <Text style={[styles.rowText, { color: colors.text }]}>Total de Ativos</Text>
                  </View>
                  <Text style={[styles.rowValue, { color: '#2E7D32' }]}>{formatCurrency(netWorth.total_assets)}</Text>
                </View>
                <View style={styles.rowItem}>
                  <View style={styles.rowIconLabel}>
                    <Icon name="minus-circle-outline" size={20} color="#C62828" />
                    <Text style={[styles.rowText, { color: colors.text }]}>Total de Passivos</Text>
                  </View>
                  <Text style={[styles.rowValue, { color: '#C62828' }]}>{formatCurrency(netWorth.total_liabilities)}</Text>
                </View>
              </View>

              {/* ATIVOS */}
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>🟢 Ativos</Text>

              {/* Contas Bancárias */}
              <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.detailGroupLabel, { color: colors.textMuted }]}>CONTAS BANCÁRIAS</Text>
                {netWorth.accounts_detail && netWorth.accounts_detail.length > 0 ? (
                  netWorth.accounts_detail.map((acc: any) => (
                    <View key={acc.id} style={styles.rowItemDetail}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon
                          name={acc.type?.toLowerCase().includes('poupança') ? 'piggy-bank-outline' : acc.type?.toLowerCase().includes('dinheiro') ? 'cash' : 'bank-outline'}
                          size={16}
                          color={acc.balance >= 0 ? '#2E7D32' : '#C62828'}
                        />
                        <View>
                          <Text style={[styles.detailLabel, { color: colors.text }]}>{acc.name}</Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>{acc.type}</Text>
                        </View>
                      </View>
                      <Text style={[styles.detailValue, { color: acc.balance >= 0 ? '#2E7D32' : '#C62828' }]}>
                        {formatCurrency(acc.balance)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Nenhuma conta cadastrada.</Text>
                )}
                <View style={[styles.divider, { marginVertical: 6 }]} />
                <View style={styles.rowItemDetail}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted, fontWeight: 'bold' }]}>Total em Contas</Text>
                  <Text style={[styles.detailValue, { color: netWorth.accounts_total >= 0 ? '#2E7D32' : '#C62828', fontWeight: 'bold' }]}>
                    {formatCurrency(netWorth.accounts_total)}
                  </Text>
                </View>
              </View>

              {/* Investimentos */}
              <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.detailGroupLabel, { color: colors.textMuted }]}>APLICAÇÕES FINANCEIRAS E INVESTIMENTOS</Text>
                <View style={styles.rowItemDetail}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="trending-up" size={16} color="#2E7D32" />
                    <Text style={[styles.detailLabel, { color: colors.text }]}>Total Aplicado</Text>
                  </View>
                  <Text style={[styles.detailValue, { color: '#2E7D32' }]}>{formatCurrency(netWorth.investments_total)}</Text>
                </View>
              </View>

              {/* PASSIVOS */}
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>🔴 Passivos</Text>

              <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.detailGroupLabel, { color: colors.textMuted }]}>DÍVIDAS E OBRIGAÇÕES</Text>
                <View style={styles.rowItemDetail}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="credit-card-multiple-outline" size={16} color="#C62828" />
                    <Text style={[styles.detailLabel, { color: colors.text }]}>Faturas em Aberto (Cartões)</Text>
                  </View>
                  <Text style={[styles.detailValue, { color: '#C62828' }]}>
                    {formatCurrency(netWorth.credit_cards_debt)}
                  </Text>
                </View>
                {netWorth.loans_total > 0 && (
                  <View style={styles.rowItemDetail}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Icon name="bank-outline" size={16} color="#C62828" />
                      <Text style={[styles.detailLabel, { color: colors.text }]}>Empréstimos / Financiamentos</Text>
                    </View>
                    <Text style={[styles.detailValue, { color: '#C62828' }]}>
                      {formatCurrency(netWorth.loans_total)}
                    </Text>
                  </View>
                )}
                <View style={[styles.divider, { marginVertical: 6 }]} />
                <View style={styles.rowItemDetail}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted, fontWeight: 'bold' }]}>Total Passivo</Text>
                  <Text style={[styles.detailValue, { color: '#C62828', fontWeight: 'bold' }]}>
                    {formatCurrency(netWorth.total_liabilities)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB: PROJEÇÃO DE SALDO (US-26) */}
          {activeTab === 'projecao' && projection && (
            <View style={styles.sectionContainer}>
              <View style={[styles.netWorthCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>SALDO ATUAL ACUMULADO</Text>
                <Text style={[styles.netWorthValue, { color: colors.text }]}>
                  {formatCurrency(projection.current_balance)}
                </Text>
              </View>

              <Text style={[styles.subSectionTitle, { color: colors.text }]}>Projeção Próximos 6 Meses</Text>
              <Text style={[styles.helperText, { color: colors.textMuted }]}>
                Calculado com base em suas transações fixas e média de despesas/receitas variáveis dos últimos 90 dias.
              </Text>
              
              <View style={styles.projectionList}>
                {projection.projection.map((item: any, index: number) => (
                  <View key={index} style={[styles.projectionItemCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.projMonth, { color: colors.text }]}>{item.month}</Text>
                    <View style={styles.projDetailsRow}>
                      <View>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>PREV. ENTRADAS</Text>
                        <Text style={{ fontSize: 13, color: '#2E7D32', fontWeight: 'bold' }}>
                          + {formatCurrency(item.projected_income)}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>PREV. SAÍDAS</Text>
                        <Text style={{ fontSize: 13, color: '#C62828', fontWeight: 'bold' }}>
                          - {formatCurrency(item.projected_expense)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>SALDO PROJETADO</Text>
                        <Text style={{ fontSize: 14, color: item.projected_balance >= 0 ? '#2E7D32' : '#C62828', fontWeight: 'bold' }}>
                          {formatCurrency(item.projected_balance)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB: INVESTIMENTOS (US-21) */}
          {activeTab === 'investimentos' && (
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: themeColor }]}
                onPress={() => setInvModalVisible(true)}
              >
                <Icon name="plus" size={20} color="#FFF" />
                <Text style={styles.addBtnText}>Novo Investimento</Text>
              </TouchableOpacity>

              {investments.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="trending-up" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhum investimento registrado.</Text>
                </View>
              ) : (
                investments.map((inv) => {
                  const gain = inv.current_value - inv.invested_value;
                  const pct = inv.invested_value > 0 ? (gain / inv.invested_value) * 100 : 0;
                  return (
                    <View key={inv.id} style={[styles.investmentCard, { backgroundColor: colors.surface }]}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={[styles.invTitle, { color: colors.text }]}>{inv.name}</Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>{inv.type} | {inv.institution || 'Outro'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteInvestmentItem(inv.id)}>
                          <Icon name="delete-outline" size={20} color="#C62828" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.invValuesRow}>
                        <View>
                          <Text style={styles.valSubLabel}>Investido</Text>
                          <Text style={[styles.valLabel, { color: colors.text }]}>{formatCurrency(inv.invested_value)}</Text>
                        </View>
                        <View>
                          <Text style={styles.valSubLabel}>Atual</Text>
                          <Text style={[styles.valLabel, { color: colors.text }]}>{formatCurrency(inv.current_value)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.valSubLabel}>Rendimento</Text>
                          <Text style={[styles.valLabel, { color: gain >= 0 ? '#2E7D32' : '#C62828', fontWeight: 'bold' }]}>
                            {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB: DESPESAS ANUAIS (US-22) */}
          {activeTab === 'anual' && (
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: themeColor }]}
                onPress={() => setAeModalVisible(true)}
              >
                <Icon name="plus" size={20} color="#FFF" />
                <Text style={styles.addBtnText}>Planejar Despesa</Text>
              </TouchableOpacity>

              {annualExpenses.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="calendar-multiselect" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma despesa anual planejada.</Text>
                </View>
              ) : (
                annualExpenses.map((ae) => (
                  <View key={ae.id} style={[styles.annualCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={[styles.aeTitle, { color: colors.text, textDecorationLine: ae.is_paid ? 'line-through' : 'none' }]}>{ae.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>Vence em: {formatDate(ae.due_date)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => toggleAePaid(ae)}>
                          <Icon
                            name={ae.is_paid ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                            size={24}
                            color={ae.is_paid ? '#2E7D32' : colors.textMuted}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteAnnualExpenseItem(ae.id)}>
                          <Icon name="delete-outline" size={20} color="#C62828" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.aeValuesRow}>
                      <View>
                        <Text style={styles.valSubLabel}>Estimado</Text>
                        <Text style={[styles.valLabel, { color: colors.text }]}>{formatCurrency(ae.estimated_value)}</Text>
                      </View>
                      {ae.notes && (
                        <View style={{ flex: 1, marginLeft: 15 }}>
                          <Text style={styles.valSubLabel}>Notas</Text>
                          <Text style={{ fontSize: 12, color: colors.textMuted }} numberOfLines={1}>{ae.notes}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL: NOVO INVESTIMENTO */}
      <Modal visible={invModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Novo Investimento</Text>
              <TouchableOpacity onPress={() => setInvModalVisible(false)}>
                <Icon name="close" size={30} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: '80%' }}>
              <Text style={styles.fieldLabel}>O QUE É ESTE INVESTIMENTO? *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                placeholder="Insira o nome deste investimento"
                value={invName}
                onChangeText={setInvName}
                placeholderTextColor={colors.placeholder}
              />
              
              <Text style={styles.fieldLabel}>TIPO DE ATIVO *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
                {['CDB/Renda Fixa', 'Tesouro Direto', 'Ações', 'FII', 'Poupança', 'Criptomoedas', 'Outros'].map(type => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setInvType(type)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: invType === type ? themeColor : colors.border,
                      backgroundColor: invType === type ? themeColor + '20' : colors.inputBg,
                    }}
                  >
                    <Text style={{ 
                      color: invType === type ? themeColor : colors.textMuted,
                      fontWeight: invType === type ? 'bold' : 'normal',
                      fontSize: 13
                    }}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>VALORES (R$) *</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                  placeholder="Valor Aplicado"
                  keyboardType="decimal-pad"
                  value={invValue}
                  onChangeText={(val) => setInvValue(formatToCurrency(val))}
                  placeholderTextColor={colors.placeholder}
                />
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                  placeholder="Saldo Atual"
                  keyboardType="decimal-pad"
                  value={invCurrent}
                  onChangeText={(val) => setInvCurrent(formatToCurrency(val))}
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              <Text style={styles.fieldLabel}>DETALHES ADICIONAIS (OPCIONAL)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                  placeholder="Taxa (% a.a.)"
                  keyboardType="numeric"
                  value={invRate}
                  onChangeText={setInvRate}
                  placeholderTextColor={colors.placeholder}
                />
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                  placeholder="Corretora/Banco"
                  value={invInstitution}
                  onChangeText={setInvInstitution}
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                placeholder="Observações"
                value={invNotes}
                onChangeText={setInvNotes}
                placeholderTextColor={colors.placeholder}
              />
              <TouchableOpacity
                style={[styles.dateSelector, { borderColor: colors.border }]}
                onPress={() => setShowInvDatePicker(true)}
              >
                <Icon name="calendar" size={20} color={themeColor} />
                <Text style={{ color: colors.text, marginLeft: 10 }}>Data de Início: {formatDate(invDate)}</Text>
              </TouchableOpacity>
              
              <Text style={styles.fieldLabel}>DEBITAR DA CONTA (OPCIONAL)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
                {accounts.map(acc => (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() => setSelectedAccountId(selectedAccountId === acc.id ? null : acc.id)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: selectedAccountId === acc.id ? themeColor : colors.border,
                      backgroundColor: selectedAccountId === acc.id ? themeColor + '20' : colors.inputBg,
                    }}
                  >
                    <Text style={{ 
                      color: selectedAccountId === acc.id ? themeColor : colors.textMuted,
                      fontWeight: selectedAccountId === acc.id ? 'bold' : 'normal',
                      fontSize: 13
                    }}>
                      {acc.name} (R$ {acc.balance})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {showInvDatePicker && (
                <DateTimePicker
                  value={invDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowInvDatePicker(false);
                    if (selectedDate) setInvDate(selectedDate);
                  }}
                />
              )}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: themeColor }]}
                onPress={handleCreateInvestment}
              >
                <Text style={styles.saveBtnText}>Salvar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: NOVA DESPESA ANUAL */}
      <Modal visible={aeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Planejar Despesa Anual</Text>
              <TouchableOpacity onPress={() => setAeModalVisible(false)}>
                <Icon name="close" size={30} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: '80%' }}>
              <Text style={styles.fieldLabel}>O QUE É ESTA DESPESA? *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                placeholder="Insira o nome desta despesa"
                value={aeName}
                onChangeText={setAeName}
                placeholderTextColor={colors.placeholder}
              />
              <Text style={styles.fieldLabel}>VALOR ESTIMADO (R$) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                placeholder="Valor (R$)"
                keyboardType="decimal-pad"
                value={aeValue}
                onChangeText={(val) => setAeValue(formatToCurrency(val))}
                placeholderTextColor={colors.placeholder}
              />
              <Text style={styles.fieldLabel}>DETALHES ADICIONAIS (OPCIONAL)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                  placeholder="Aviso (Dias antes)"
                  keyboardType="numeric"
                  value={aeAlertDays}
                  onChangeText={setAeAlertDays}
                  placeholderTextColor={colors.placeholder}
                />
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
                placeholder="Observações adicionais"
                value={aeNotes}
                onChangeText={setAeNotes}
                placeholderTextColor={colors.placeholder}
              />
            <TouchableOpacity
              style={[styles.dateSelector, { borderColor: colors.border }]}
              onPress={() => setShowAeDatePicker(true)}
            >
              <Icon name="calendar" size={20} color={themeColor} />
              <Text style={{ color: colors.text, marginLeft: 10 }}>Data de Vencimento: {formatDate(aeDate)}</Text>
            </TouchableOpacity>
            {showAeDatePicker && (
              <DateTimePicker
                value={aeDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowAeDatePicker(false);
                  if (selectedDate) setAeDate(selectedDate);
                }}
              />
            )}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: themeColor }]}
              onPress={handleCreateAnnualExpense}
            >
              <Text style={styles.saveBtnText}>Salvar Planejamento</Text>
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
  screenTitle: { fontSize: 22, fontWeight: 'bold' },
  tabsWrapper: { height: 50, marginBottom: 10 },
  tabsScroll: { paddingHorizontal: 15, gap: 10 },
  tabButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderRadius: 24, borderWidth: 1, borderColor: '#EEE', gap: 8, height: 44 },
  tabLabel: { fontSize: 13, fontWeight: 'bold' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  fieldLabel: { fontSize: 11, fontWeight: 'bold', color: '#999', marginBottom: 8, marginTop: 10, letterSpacing: 1 },
  pickerContainer: { borderRadius: 20, borderWidth: 1, marginBottom: 15, overflow: 'hidden' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionContainer: { gap: 20, marginTop: 10 },
  netWorthCard: { borderRadius: 24, padding: 20, elevation: 2 },
  cardLabel: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  netWorthValue: { fontSize: 32, fontWeight: 'bold', marginTop: 10, marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  rowIconLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 14 },
  rowValue: { fontSize: 15, fontWeight: 'bold' },
  subSectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  detailCard: { borderRadius: 24, padding: 20, elevation: 2, gap: 12 },
  detailGroupLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  rowItemDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 15, fontWeight: 'bold' },
  helperText: { fontSize: 12, lineHeight: 18 },
  projectionList: { gap: 12 },
  projectionItemCard: { borderRadius: 20, padding: 16, elevation: 2, gap: 8 },
  projMonth: { fontSize: 15, fontWeight: 'bold' },
  projDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  addBtn: { flexDirection: 'row', padding: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 2 },
  addBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 14 },
  investmentCard: { borderRadius: 20, padding: 18, elevation: 2, gap: 12 },
  annualCard: { borderRadius: 20, padding: 18, elevation: 2, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invTitle: { fontSize: 16, fontWeight: 'bold' },
  aeTitle: { fontSize: 16, fontWeight: 'bold' },
  invValuesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aeValuesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valSubLabel: { fontSize: 10, color: '#999', textTransform: 'uppercase', marginBottom: 2 },
  valLabel: { fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold' },
  input: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 15, fontSize: 16 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 24 },
  saveBtn: { padding: 22, borderRadius: 24, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 }
});
