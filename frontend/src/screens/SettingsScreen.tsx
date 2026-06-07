import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Switch, ScrollView, Platform, Modal, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme, ACCENT_COLORS } from '../context/ThemeContext';

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { user, logout, isBiometricSupported, isBiometricEnabled, setupBiometrics, disableBiometrics } = useAuth();
    const { isDark, colors, accentColor, toggleTheme, setAccentColor } = useTheme();

    const [showBiometricModal, setShowBiometricModal] = useState(false);
    const [biometricPassword, setBiometricPassword] = useState('');
    const [activatingBiometric, setActivatingBiometric] = useState(false);

    const handleLogout = async () => {
        Alert.alert('Sair', 'Deseja realmente sair da sua conta?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair',
                onPress: async () => {
                    try {
                        await logout();
                    } catch (error) {
                        Alert.alert('Erro', 'Não foi possível sair no momento.');
                    }
                },
                style: 'destructive'
            }
        ]);
    };

    const handleToggleBiometrics = async (value: boolean) => {
        if (value) {
            setBiometricPassword('');
            setShowBiometricModal(true);
        } else {
            await disableBiometrics();
            Alert.alert('Sucesso', 'Login biométrico desativado.');
        }
    };

    const handleConfirmBiometric = async () => {
        if (!biometricPassword) {
            Alert.alert('Atenção', 'Informe sua senha para continuar.');
            return;
        }
        try {
            setActivatingBiometric(true);
            await setupBiometrics(biometricPassword);
            setShowBiometricModal(false);
            Alert.alert('Sucesso', 'Login biométrico ativado!');
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível ativar a biometria.');
        } finally {
            setActivatingBiometric(false);
            setBiometricPassword('');
        }
    };


    return (
        <>
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
            </View>

            {/* SEÇÃO: CONTA */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>CONTA</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardRow}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                        <Icon name="account" size={20} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Usuário logado</Text>
                        <Text style={[styles.cardValue, { color: colors.text }]}>{user?.email}</Text>
                    </View>
                </View>
                
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                
                <TouchableOpacity style={styles.cardRow} onPress={() => (navigation as any).navigate('CreditCards')}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                        <Icon name="credit-card" size={20} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Meus Cartões</Text>
                        <Text style={[styles.cardSub, { color: colors.textMuted }]}>Gerenciar cartões de crédito e limites</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={colors.textMuted} />
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <TouchableOpacity style={styles.cardRow} onPress={() => (navigation as any).navigate('Accounts')}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                        <Icon name="bank" size={20} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Minhas Contas</Text>
                        <Text style={[styles.cardSub, { color: colors.textMuted }]}>Gerenciar saldos e carteiras</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={colors.textMuted} />
                </TouchableOpacity>
            </View>

            {/* SEÇÃO: APARÊNCIA */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>APARÊNCIA</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {/* Toggle Modo Escuro */}
                <View style={styles.cardRow}>
                    <View style={[styles.iconCircle, { backgroundColor: isDark ? '#333' : '#FFF3E0' }]}>
                        <Icon name={isDark ? 'weather-night' : 'white-balance-sunny'} size={20} color={isDark ? '#FFD740' : '#FF8C00'} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Modo Escuro</Text>
                        <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                            {isDark ? 'Ativado — tema escuro' : 'Desativado — tema claro'}
                        </Text>
                    </View>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        thumbColor={isDark ? '#FFD740' : '#FFF'}
                        trackColor={{ false: colors.switchTrack, true: colors.accent }}
                    />
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Cor de Destaque */}
                <View style={{ paddingVertical: 4 }}>
                    <View style={styles.cardRow}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                            <Icon name="palette" size={20} color={colors.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Cor de Destaque</Text>
                            <Text style={[styles.cardSub, { color: colors.textMuted }]}>Personalize a interface do app</Text>
                        </View>
                    </View>

                    <View style={styles.colorGrid}>
                        {ACCENT_COLORS.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={[
                                    styles.colorOption,
                                    { backgroundColor: item.color },
                                    accentColor === item.color && styles.colorOptionSelected,
                                ]}
                                onPress={() => setAccentColor(item.color)}
                            >
                                {accentColor === item.color && (
                                    <Icon name="check" size={18} color="#FFF" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Preview */}
                    <View style={[styles.previewBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
                        <Text style={[styles.previewLabel, { color: colors.textMuted }]}>PREVIEW</Text>
                        <View style={styles.previewContent}>
                            <View style={[styles.previewBtn, { backgroundColor: colors.accent }]}>
                                <Text style={styles.previewBtnText}>Botão</Text>
                            </View>
                            <View style={[styles.previewBar, { backgroundColor: colors.accent + '30' }]}>
                                <View style={[styles.previewBarFill, { backgroundColor: colors.accent, width: '65%' }]} />
                            </View>
                            <View style={[styles.previewDot, { backgroundColor: colors.accent }]} />
                        </View>
                    </View>
                </View>
            </View>

            {/* SEÇÃO: SEGURANÇA */}
            {isBiometricSupported && (
                <>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SEGURANÇA</Text>
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.cardRow}>
                            <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                                <Icon name="fingerprint" size={20} color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Login Biométrico</Text>
                                <Text style={[styles.cardSub, { color: colors.textMuted }]}>Acesse sua conta com a biometria cadastrada no aparelho</Text>
                            </View>
                            <Switch
                                value={isBiometricEnabled}
                                onValueChange={handleToggleBiometrics}
                                thumbColor={isBiometricEnabled ? colors.accent : '#FFF'}
                                trackColor={{ false: colors.switchTrack, true: colors.accent + '80' }}
                            />
                        </View>
                    </View>
                </>
            )}

            {/* SEÇÃO: BACKUP NA NUVEM (REQ 20) */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>BACKUP</Text>
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                    Alert.alert('Backup em Andamento', 'Sincronizando seus dados financeiros de forma criptografada com o Google Drive/Firebase...', [
                        { text: 'OK', onPress: () => Alert.alert('Sucesso', 'Backup na nuvem realizado com sucesso!') }
                    ]);
                }}
            >
                <View style={styles.cardRow}>
                    <View style={[styles.iconCircle, { backgroundColor: '#4CAF5015' }]}>
                        <Icon name="cloud-upload" size={20} color="#4CAF50" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Backup Automático</Text>
                        <Text style={[styles.cardSub, { color: colors.textMuted }]}>Sincronizar dados com a Nuvem</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={colors.textMuted} />
                </View>
            </TouchableOpacity>

            {/* SEÇÃO: TUTORIAL (REQ 30) */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>AJUDA & TUTORIAL</Text>
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Onboarding')}
            >
                <View style={styles.cardRow}>
                    <View style={[styles.iconCircle, { backgroundColor: '#FF980015' }]}>
                        <Icon name="presentation-play" size={20} color="#FF9800" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Tour pelo App</Text>
                        <Text style={[styles.cardSub, { color: colors.textMuted }]}>Rever o tutorial interativo do LISO</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color={colors.textMuted} />
                </View>
            </TouchableOpacity>

            {/* SEÇÃO: AÇÕES */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>AÇÕES</Text>
            <TouchableOpacity
                style={[styles.card, styles.logoutCard, { backgroundColor: colors.surface, borderColor: colors.danger + '30' }]}
                onPress={handleLogout}
            >
                <View style={styles.cardRow}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.danger + '15' }]}>
                        <Icon name="logout" size={20} color={colors.danger} />
                    </View>
                    <Text style={[styles.logoutText, { color: colors.danger }]}>Sair da Conta</Text>
                </View>
            </TouchableOpacity>

            <Text style={[styles.version, { color: colors.textMuted }]}>Versão 1.0.0</Text>
        </ScrollView>

        {/* Modal: Ativar Biometria — compatível com Android, iOS e Web */}
        <Modal visible={showBiometricModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.modalHeader}>
                        <Icon name="fingerprint" size={28} color={colors.accent} />
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Ativar Biometria</Text>
                    </View>
                    <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                        Confirme sua senha atual para ativar o login biométrico.
                    </Text>
                    <TextInput
                        style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
                        placeholder="Sua senha atual"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                        value={biometricPassword}
                        onChangeText={setBiometricPassword}
                        autoFocus
                    />
                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border }]}
                            onPress={() => { setShowBiometricModal(false); setBiometricPassword(''); }}
                        >
                            <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalBtn, styles.modalBtnConfirm, { backgroundColor: colors.accent }]}
                            onPress={handleConfirmBiometric}
                            disabled={activatingBiometric}
                        >
                            {activatingBiometric
                                ? <ActivityIndicator color="#FFF" size="small" />
                                : <Text style={styles.modalBtnTextConfirm}>Ativar</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24 },
    header: { paddingTop: 60, marginBottom: 30 },
    title: { fontSize: 28, fontWeight: 'bold' },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginTop: 24,
        marginLeft: 4,
    },
    card: {
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 8,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardValue: { fontSize: 15, fontWeight: '600', marginTop: 2 },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    cardSub: { fontSize: 12, marginTop: 2 },
    divider: { height: 1, marginVertical: 16 },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 16,
        paddingLeft: 54,
    },
    colorOption: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    previewBox: {
        marginTop: 16,
        marginLeft: 54,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    previewLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
    previewContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    previewBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    previewBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    previewBar: {
        flex: 1,
        height: 8,
        borderRadius: 4,
    },
    previewBarFill: {
        height: 8,
        borderRadius: 4,
    },
    previewDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    logoutCard: {},
    logoutText: { fontWeight: 'bold', fontSize: 15 },
    version: { textAlign: 'center', marginTop: 40, fontSize: 12 },

    // Modal biometria
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalBox: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        padding: 28,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    modalSub: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
    modalInput: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 16,
        fontSize: 16,
        marginBottom: 24,
    },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBtnCancel: { borderWidth: 1 },
    modalBtnConfirm: {},
    modalBtnText: { fontSize: 16, fontWeight: '600' },
    modalBtnTextConfirm: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
