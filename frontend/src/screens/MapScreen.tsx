import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export const MapScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, accentColor } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
          <Icon name="map-marker-radius" size={60} color={accentColor} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Mapa de Gastos</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          O recurso de mapa utiliza sensores de GPS nativos e o Google Maps SDK, que estão disponíveis apenas nos aplicativos Android e iOS.
        </Text>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="cellphone-iphone" size={32} color={colors.textSecondary} />
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            Para visualizar seus gastos no mapa, abra este projeto no app <Text style={{fontWeight: 'bold', color: accentColor}}>Expo Go</Text> no seu celular.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: accentColor }]}
          onPress={() => navigation.navigate('Main')}
        >
          <Icon name="arrow-left" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Voltar para a Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { alignItems: 'center', maxWidth: 400 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 1, gap: 16, marginBottom: 32 },
  cardText: { flex: 1, fontSize: 14, lineHeight: 20 },
  button: { height: 56, paddingHorizontal: 24, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
