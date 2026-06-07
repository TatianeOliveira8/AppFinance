import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { transactionService } from '../services/transactionService';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDate } from '../utils/helpers';

const { width, height } = Dimensions.get('window');

export const MapScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const [region, setRegion] = useState({
    latitude: -23.5505, // Default São Paulo
    longitude: -46.6333,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  const loadTransactions = async () => {
    try {
      setLoading(true);
      // Busca todas as transações (poderíamos filtrar apenas as com GPS no backend, 
      // mas aqui filtramos no front para simplicidade)
      const data = await transactionService.getTransactions();
      const withGps = data.filter((t: any) => t.latitude && t.longitude);
      setTransactions(withGps);

      if (withGps.length > 0) {
        // Centraliza no último gasto
        const last = withGps[0];
        setRegion({
          ...region,
          latitude: last.latitude,
          longitude: last.longitude,
        });
      }
    } catch (error) {
      console.log('Erro ao carregar mapa:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: any): any => {
    if (!category || !category.icon) return 'tag';
    return category.icon;
  };

  if (loading && transactions.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 10, color: colors.textMuted }}>Carregando seu mapa...</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Icon name="map-search" size={64} color={colors.textMuted} />
        <Text style={{ marginTop: 20, color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Mapa disponível no celular</Text>
        <Text style={{ marginTop: 10, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 }}>
          O recurso de mapa de gastos utiliza sensores de GPS nativos e está disponível apenas nos apps Android e iOS.
        </Text>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: colors.surface, marginTop: 30 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.text }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={setRegion}
        customMapStyle={colors.background === '#121212' ? darkMapStyle : []}
      >
        {transactions.map((t) => (
          <Marker
            key={t.id}
            coordinate={{ latitude: t.latitude, longitude: t.longitude }}
            pinColor={t.category?.color || colors.accent}
          >
            <View style={[styles.markerContainer, { backgroundColor: t.category?.color || colors.accent }]}>
              <Icon name={getCategoryIcon(t.category)} size={16} color="#FFF" />
            </View>
            
            <Callout tooltip onPress={() => navigation.navigate('History', { transactionId: t.id })}>
              <View style={[styles.callout, { backgroundColor: colors.surface }]}>
                <Text style={[styles.calloutTitle, { color: colors.text }]}>{t.description || 'Gasto'}</Text>
                <Text style={[styles.calloutValue, { color: t.type === 'income' ? colors.success : colors.danger }]}>
                  {formatCurrency(t.value)}
                </Text>
                <Text style={[styles.calloutDate, { color: colors.textMuted }]}>{formatDate(t.date)}</Text>
                {t.location_address && (
                  <Text style={[styles.calloutAddr, { color: colors.textMuted }]} numberOfLines={1}>
                    📍 {t.location_address}
                  </Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* OVERLAY UI */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.titleCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Mapa de Gastos</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{transactions.length} locais registrados</Text>
        </View>
      </View>

      {transactions.length === 0 && (
        <View style={styles.emptyWarning}>
          <View style={[styles.warningCard, { backgroundColor: colors.surface }]}>
            <Icon name="map-marker-off" size={40} color={colors.danger} />
            <Text style={[styles.warningText, { color: colors.text }]}>Nenhum gasto com GPS encontrado.</Text>
            <Text style={[styles.warningSub, { color: colors.textMuted }]}>
              Ative o GPS ao cadastrar novas despesas para vê-las aqui.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: width, height: height },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  titleCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  title: { fontSize: 16, fontWeight: 'bold' },
  subtitle: { fontSize: 11 },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 3,
  },
  callout: {
    width: 200,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  calloutValue: { fontWeight: '800', fontSize: 16, marginBottom: 4 },
  calloutDate: { fontSize: 10, marginBottom: 4 },
  calloutAddr: { fontSize: 10, fontStyle: 'italic' },
  emptyWarning: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  warningCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  warningText: { fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  warningSub: { fontSize: 13, textAlign: 'center', marginTop: 4 },
});
