import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export const SettingsScreen: React.FC = () => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sair', onPress: logout, style: 'destructive' }
        ]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Configurações</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Usuário logado</Text>
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sair da Conta</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Versão 1.0.0</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FD', padding: 24 },
    header: { paddingTop: 60, marginBottom: 40 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' },
    section: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        marginBottom: 40
    },
    label: { fontSize: 12, color: '#AAA', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8 },
    email: { fontSize: 16, color: '#333', fontWeight: '600' },
    logoutBtn: {
        backgroundColor: '#FFF',
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FF3B30',
        alignItems: 'center'
    },
    logoutText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 16 },
    version: { textAlign: 'center', marginTop: 'auto', color: '#CCC', fontSize: 12, marginBottom: 20 }
});
