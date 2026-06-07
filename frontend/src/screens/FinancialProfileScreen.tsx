import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const FinancialProfileScreen = () => {
  const navigation = useNavigation();
  const { colors, accentColor } = useTheme();
  
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [billDueDate, setBillDueDate] = useState('');
  const [financialGoals, setFinancialGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/api/financial-profile');
      if (response.data) {
        setMonthlyIncome(response.data.monthly_income.toString());
        setBillDueDate(response.data.bill_due_date.toString());
        setFinancialGoals(response.data.financial_goals || '');
      }
    } catch (error) {
      console.log('Perfil não encontrado, o usuário irá criar um novo.');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!monthlyIncome || !billDueDate) {
      Alert.alert('Campos Obrigatórios', 'Por favor, informe sua renda e o dia de vencimento das contas.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/financial-profile', {
        monthly_income: parseFloat(monthlyIncome),
        bill_due_date: billDueDate,
        financial_goals: financialGoals,
      });
      Alert.alert('Sucesso! 🎉', 'Seu perfil financeiro foi configurado. Agora vamos organizar suas finanças!');
      navigation.navigate('Main');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar seu perfil.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
            <Icon name="rocket-launch" size={40} color={accentColor} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Vamos começar!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Para personalizar sua experiência, precisamos entender um pouco da sua realidade financeira.
          </Text>
        </View>

        <View style={styles.form}>
          {/* RENDA MENSAL */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Sua Renda Mensal Média</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.currencyPrefix, { color: accentColor }]}>R$</Text>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                keyboardType="numeric"
                value={monthlyIncome}
                onChangeText={setMonthlyIncome}
                placeholder="0,00"
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <Text style={styles.helperText}>Somando salário e rendas extras.</Text>
          </View>

          {/* DIA DE VENCIMENTO */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Dia de Vencimento das Contas</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon name="calendar-clock" size={20} color={accentColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                keyboardType="numeric"
                value={billDueDate}
                onChangeText={setBillDueDate}
                placeholder="Insira o dia de vencimento (1 a 31)"
                maxLength={2}
                placeholderTextColor={colors.placeholder}
              />
            </View>
            <Text style={styles.helperText}>O dia do mês em que a maioria dos seus boletos vence.</Text>
          </View>

          {/* OBJETIVOS */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Seu Principal Objetivo</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border, height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
              <Icon name="target" size={20} color={accentColor} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, textAlignVertical: 'top' }]}
                value={financialGoals}
                onChangeText={setFinancialGoals}
                placeholder="Insira seus objetivos financeiros"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor, shadowColor: accentColor }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.buttonText}>Salvar e Continuar</Text>
                <Icon name="arrow-right" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => navigation.navigate('Main')}
          >
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Configurar depois</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  currencyPrefix: { fontSize: 16, fontWeight: 'bold', marginRight: 8 },
  input: { flex: 1, fontSize: 16 },
  helperText: { fontSize: 11, color: '#999', marginTop: 6, marginLeft: 4 },
  button: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  skipButton: { marginTop: 20, alignItems: 'center', padding: 10 },
  skipText: { fontSize: 14, fontWeight: '500' },
});

export default FinancialProfileScreen;