import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { validateEmail } from '../utils/helpers';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithBiometrics, isBiometricEnabled, isBiometricSupported } = useAuth();
  const { colors } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Erro', 'Email inválido');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Erro no Login', error.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!isBiometricEnabled) {
      Alert.alert(
        'Biometria não ativada',
        'Para usar o login rápido, primeiro entre com sua senha e ative a biometria nas Configurações (ícone de engrenagem).'
      );
      return;
    }
    try {
      setLoading(true);
      await loginWithBiometrics();
    } catch (error: any) {
      Alert.alert('Erro na Biometria', error.message || 'Não foi possível autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={[styles.logoWrapper, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Image
              source={require('../../public/image copy.png')}
              style={styles.logoImage}
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>LISO</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tome o controle total da sua vida financeira.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>E-mail</Text>
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
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Senha</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, borderColor: colors.border }]}
              placeholder="Insira sua senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.accent, shadowColor: colors.accent }, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          {isBiometricSupported && (
            <TouchableOpacity
              style={[styles.biometricButton, { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 1 }, loading && styles.disabledButton]}
              onPress={handleBiometricLogin}
              disabled={loading}
            >
              <Icon name="fingerprint" size={24} color={colors.accent} />
              <Text style={[styles.biometricButtonText, { color: colors.accent }]}>Entrar com Biometria</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text style={[styles.registerText, { color: colors.textSecondary }]}>
              Não tem conta? <Text style={[styles.registerLink, { color: colors.accent }]}>Comece agora</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  header: { alignItems: 'center', marginBottom: 48 },
  logoWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logoImage: {
    width: '65%',
    height: '65%',
    resizeMode: 'contain',
  },
  title: { fontSize: 40, fontWeight: '900', color: '#1A1A1A', letterSpacing: 2 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4, textAlign: 'center' },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  input: {
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  loginButton: {
    backgroundColor: '#FF8C00',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  biometricButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  disabledButton: { opacity: 0.6 },
  registerButton: { marginTop: 24, alignItems: 'center' },
  registerText: { color: '#666', fontSize: 14 },
  registerLink: { color: '#FF8C00', fontWeight: 'bold' },
});
