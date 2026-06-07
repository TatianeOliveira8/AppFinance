import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { validateEmail, validatePassword } from '../utils/helpers';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const { register } = useAuth();
  const { colors } = useTheme();

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const { errors } = validatePassword(value);
    setPasswordErrors(errors);
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Email inválido');
      return;
    }

    const { isValid: passwordValid } = validatePassword(password);
    if (!passwordValid) {
      Alert.alert('Erro', 'Senha muito fraca');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não conferem');
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      // O AuthContext já redireciona se o estado de auth mudar, 
      // ou você pode adicionar um navigation.navigate('Home') se necessário.
    } catch (error: any) {
      Alert.alert('Erro no Registro', error.message || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonTouch} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.accent} />
          <Text style={[styles.backButtonText, { color: colors.accent }]}>Voltar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Criar Conta</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Comece a organizar suas finanças hoje mesmo.</Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
            placeholder="Insira seu email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor={colors.placeholder}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Senha</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
            placeholder="Insira sua senha"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
            editable={!loading}
            placeholderTextColor={colors.placeholder}
          />
          {passwordErrors.length > 0 && (
            <View style={styles.errorBox}>
              {passwordErrors.map((error, index) => (
                <Text key={index} style={styles.errorText}>
                  • {error}
                </Text>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: colors.textSecondary }]}>Confirmar Senha</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
            placeholder="Insira sua senha novamente"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
            placeholderTextColor={colors.placeholder}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent, shadowColor: colors.accent }, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Criar Conta</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButtonTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FF8C00',
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#FF8C00',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
