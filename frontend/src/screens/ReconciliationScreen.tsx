import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { transactionService } from '../services/transactionService';
import { formatDate } from '../utils/helpers';
import { CONFIG } from '../config';
import { storage } from '../utils/storage';

export default function ReconciliationScreen({ navigation }: any) {
  const { colors } = useTheme();
  const themeColor = colors.accent;

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

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

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setLoading(true);
      
      if (Platform.OS === 'web') {
        const blob = format === 'csv' 
          ? await transactionService.exportCSV() 
          : await transactionService.exportPDF();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = format === 'csv' ? 'transacoes.csv' : 'relatorio.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        Alert.alert('Sucesso', 'Download iniciado!');
      } else {
        // Native Export using Blob to Base64 (Solves the FileSystem URL block issue)
        const blob = format === 'csv' 
          ? await transactionService.exportCSV() 
          : await transactionService.exportPDF();
          
        const fileName = format === 'csv' ? 'transacoes.csv' : 'relatorio.pdf';
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
            dialogTitle: format === 'csv' ? 'Exportar CSV' : 'Exportar PDF'
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
                  { backgroundColor: colors.surface },
                  t.already_exists && { backgroundColor: '#FFF9C4', borderColor: '#FBC02D', borderWidth: 1 }
                ]}
                onPress={() => !t.already_exists && toggleSelect(idx)}
                disabled={t.already_exists}
              >
                <Icon
                  name={t.already_exists ? "checkbox-marked-circle" : (selectedIndices.includes(idx) ? "checkbox-marked" : "checkbox-blank-outline")}
                  size={24}
                  color={t.already_exists ? '#FBC02D' : themeColor}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.descText, { color: colors.text }]} numberOfLines={1}>{t.description}</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>
                    {formatDate(t.date)} • Sugestão: {t.suggested_category_name || 'Nenhuma'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: t.type === 'income' ? '#2E7D32' : '#C62828' }}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.value.toFixed(2)}
                  </Text>
                  {t.already_exists && (
                    <Text style={{ fontSize: 10, color: '#F57F17', fontWeight: 'bold' }}>Reconciliado</Text>
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

          <View style={styles.exportRow}>
            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: themeColor }]}
              onPress={() => handleExport('csv')}
            >
              <Icon name="file-document-outline" size={22} color="#FFF" />
              <Text style={styles.exportBtnText}>Planilha CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: themeColor }]}
              onPress={() => handleExport('pdf')}
            >
              <Icon name="file-document-outline" size={22} color="#FFF" />
              <Text style={styles.exportBtnText}>Relatório PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  transactionRow: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 12, elevation: 1 },
  descText: { fontSize: 15, fontWeight: 'bold' },
  importBtn: { padding: 20, borderRadius: 24, alignItems: 'center', marginTop: 20 },
  importBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  exportRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  exportBtn: { flex: 1, flexDirection: 'row', padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 10 },
  exportBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});
