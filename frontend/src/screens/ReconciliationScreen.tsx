import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { transactionService } from '../services/transactionService';
import { formatCurrency, formatDate } from '../utils/helpers';
import { CONFIG } from '../config';
import { storage } from '../utils/storage';

export default function ReconciliationScreen({ navigation }: any) {
  const { colors } = useTheme();
  const themeColor = colors.accent;

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;

      const file = res.assets[0];
      setLoading(true);

      const data = await transactionService.importTransactions({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream'
      });

      setTransactions(data.transactions);

      // Auto-select non-existing ones
      const nonExisting: number[] = [];
      data.transactions.forEach((t: any, index: number) => {
        if (!t.already_exists) {
          nonExisting.push(index);
        }
      });
      setSelectedIndices(nonExisting);

      Alert.alert('Sucesso', `${data.transactions.length} transações lidas do extrato bancário.`);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível ler o extrato bancário. Verifique o formato.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportSelected = async () => {
    if (selectedIndices.length === 0) {
      Alert.alert('Aviso', 'Selecione pelo menos uma transação para importar.');
      return;
    }

    setImporting(true);
    try {
      let count = 0;
      for (const idx of selectedIndices) {
        const item = transactions[idx];
        await transactionService.createTransaction({
          value: item.value,
          type: item.type,
          description: item.description,
          date: new Date(item.date).toISOString(),
          category_id: item.suggested_category_id || null,
          is_paid: true,
          is_fixed: false,
          payment_method: 'debito'
        });
        count++;
      }
      Alert.alert('Sucesso', `${count} transações importadas e reconciliadas com sucesso!`);
      setTransactions([]);
      setSelectedIndices([]);
    } catch (e) {
      Alert.alert('Erro', 'Erro ao importar algumas transações.');
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter(i => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf', reportType: 'monthly' | 'annual' = 'monthly') => {
    try {
      setLoading(true);
      setReportModalVisible(false);

      let blob: Blob;
      let fileName: string;

      if (reportType === 'annual') {
        blob = format === 'csv'
          ? await transactionService.exportAnnualCSV()
          : await transactionService.exportAnnualPDF();
        fileName = format === 'csv' ? 'relatorio_anual.csv' : 'relatorio_anual.pdf';
      } else {
        blob = format === 'csv'
          ? await transactionService.exportCSV()
          : await transactionService.exportPDF();
        fileName = format === 'csv' ? 'transacoes.csv' : 'relatorio.pdf';
      }

      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        Alert.alert('Sucesso', 'Download iniciado!');
      } else {
        // Native Export using Blob to Base64 (Solves the FileSystem URL block issue)
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            try {
              const base64data = reader.result as string;
              // Separa o prefixo "data:application/pdf;base64," do conteúdo real
              const base64Content = base64data.includes(',') ? base64data.split(',')[1] : base64data;
              await FileSystem.writeAsStringAsync(fileUri, base64Content, {
                encoding: FileSystem.EncodingType.Base64,
              });
              resolve(true);
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = () => reject(new Error('Erro ao ler o arquivo gerado'));
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: format === 'csv' ? 'text/csv' : 'application/pdf',
            dialogTitle: reportType === 'annual'
              ? (format === 'csv' ? 'Exportar Relatório Anual CSV' : 'Exportar Relatório Anual PDF')
              : (format === 'csv' ? 'Exportar CSV' : 'Exportar PDF')
          });
        } else {
          Alert.alert('Sucesso', 'Arquivo salvo internamente no celular.');
        }
      }
    } catch (e: any) {
      console.error('Erro de exportação:', e);
      Alert.alert('Erro ao Exportar', `Detalhes: ${e.message || String(e)}\n\nVerifique se o aplicativo tem permissão para acessar os arquivos/armazenamento do dispositivo.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={30} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Conciliação Bancária</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* IMPORT SECTION (US-34) */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Importar Extrato Bancário</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            Selecione um arquivo de extrato bancário (.OFX ou .CSV) para conciliação automática das suas despesas.
          </Text>

          <TouchableOpacity
            style={[styles.uploadBtn, { borderColor: themeColor }]}
            onPress={handlePickDocument}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={themeColor} />
            ) : (
              <>
                <Icon name="file-upload-outline" size={32} color={themeColor} />
                <Text style={[styles.uploadBtnText, { color: themeColor }]}>Carregar Arquivo Extrato</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* TRANSACTIONS RECONCILIATION LIST */}
        {transactions.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>Transações Encontradas</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{selectedIndices.length} selecionadas</Text>
            </View>

            {transactions.map((t, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.transactionRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  t.already_exists && { backgroundColor: colors.inputBg, opacity: 0.8 }
                ]}
                onPress={() => !t.already_exists && toggleSelect(idx)}
                activeOpacity={t.already_exists ? 1 : 0.7}
              >
                <View style={[styles.iconContainer, t.already_exists ? { backgroundColor: '#4CAF5015' } : { backgroundColor: themeColor + '15' }]}>
                  <Icon
                    name={t.already_exists ? "check-all" : (selectedIndices.includes(idx) ? "check-circle" : "circle-outline")}
                    size={22}
                    color={t.already_exists ? '#4CAF50' : (selectedIndices.includes(idx) ? themeColor : colors.border)}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.descText, { color: colors.text }]} numberOfLines={1}>{t.description}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {formatDate(t.date)}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text style={[styles.valueText, { color: t.type === 'income' ? '#4CAF50' : colors.text }]}>
                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.value)}
                  </Text>
                  {t.already_exists && (
                    <View style={styles.badgeReconciled}>
                      <Text style={styles.badgeReconciledText}>Já Registrado</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.importBtn, { backgroundColor: themeColor }]}
              onPress={handleImportSelected}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.importBtnText}>Importar & Reconciliar ({selectedIndices.length})</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* EXPORT SECTION (US-29, US-19) */}
        <View style={[styles.card, { backgroundColor: colors.surface, marginTop: 25 }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Exportar Relatórios</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            Gere relatórios completos de suas transações para o contador ou controle externo.
          </Text>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: themeColor, marginBottom: 12 }]}
            onPress={() => setReportModalVisible(true)}
          >
            <Icon name="file-document-outline" size={22} color="#FFF" />
            <Text style={styles.exportBtnText}>Gerar Relatório</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* REPORT TYPE SELECTION MODAL */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Tipo de Relatório</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Icon name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.reportOptions}>
              {/* RELATÓRIO MENSAL */}
              <View style={styles.reportSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Icon name="calendar-month-outline" size={22} color={themeColor} />
                  <Text style={[styles.reportSectionTitle, { color: colors.text }]}>Relatório Mensal</Text>
                </View>
                <Text style={[styles.reportSectionDesc, { color: colors.textMuted }]}>
                  Todas as transações do mês com análise detalhada
                </Text>
                <View style={styles.reportButtonGroup}>
                  <TouchableOpacity
                    style={[styles.reportTypeBtn, { backgroundColor: themeColor }]}
                    onPress={() => handleExport('csv', 'monthly')}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Icon name="file-delimited" size={20} color="#FFF" />
                        <Text style={styles.reportTypeBtnText}>CSV</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportTypeBtn, { backgroundColor: themeColor }]}
                    onPress={() => handleExport('pdf', 'monthly')}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Icon name="file-pdf-box" size={20} color="#FFF" />
                        <Text style={styles.reportTypeBtnText}>PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              {/* RELATÓRIO ANUAL */}
              <View style={styles.reportSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Icon name="chart-line" size={22} color={themeColor} />
                  <Text style={[styles.reportSectionTitle, { color: colors.text }]}>Relatório Anual</Text>
                </View>
                <Text style={[styles.reportSectionDesc, { color: colors.textMuted }]}>
                  Análise completa do ano por categoria e mês
                </Text>
                <View style={styles.reportButtonGroup}>
                  <TouchableOpacity
                    style={[styles.reportTypeBtn, { backgroundColor: themeColor }]}
                    onPress={() => handleExport('csv', 'annual')}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Icon name="file-delimited" size={20} color="#FFF" />
                        <Text style={styles.reportTypeBtnText}>CSV</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportTypeBtn, { backgroundColor: themeColor }]}
                    onPress={() => handleExport('pdf', 'annual')}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Icon name="file-pdf-box" size={20} color="#FFF" />
                        <Text style={styles.reportTypeBtnText}>PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  backButton: { marginLeft: -10, padding: 5 },
  screenTitle: { fontSize: 26, fontWeight: '900' },
  card: { borderRadius: 24, padding: 24, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  cardSub: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  uploadBtn: { borderStyle: 'dashed', borderWidth: 2, borderRadius: 24, padding: 35, alignItems: 'center', gap: 12, justifyContent: 'center' },
  uploadBtnText: { fontSize: 16, fontWeight: 'bold' },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descText: { fontSize: 15, fontWeight: 'bold' },
  valueText: { fontSize: 16, fontWeight: '900' },
  badgeReconciled: {
    backgroundColor: '#4CAF5015',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  badgeReconciledText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4CAF50',
    textTransform: 'uppercase',
  },
  importBtn: { padding: 20, borderRadius: 24, alignItems: 'center', marginTop: 10 },
  importBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  exportRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  exportBtn: { flex: 1, flexDirection: 'row', padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 10 },
  exportBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold' },
  reportOptions: { gap: 20 },
  reportSection: { gap: 12 },
  reportSectionTitle: { fontSize: 16, fontWeight: 'bold' },
  reportSectionDesc: { fontSize: 13, lineHeight: 18 },
  reportButtonGroup: { flexDirection: 'row', gap: 10 },
  reportTypeBtn: { flex: 1, flexDirection: 'row', padding: 14, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 8 },
  reportTypeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 }
});
