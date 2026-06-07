import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Dimensions, Image } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Bem-vindo ao LISO!',
    description: 'Seu assistente financeiro pessoal. Vamos te ajudar a assumir o controle total do seu dinheiro de forma inteligente e prática.',
    icon: 'rocket-launch'
  },
  {
    id: '2',
    title: 'Acompanhe tudo',
    description: 'Registre suas despesas, receitas e transferências em um só lugar. Organize usando categorias e tags.',
    icon: 'chart-pie'
  },
  {
    id: '3',
    title: 'Orçamentos e Metas',
    description: 'Defina limites mensais para não estourar no cartão e crie metas para alcançar seus grandes sonhos.',
    icon: 'bullseye-arrow'
  },
  {
    id: '4',
    title: 'Dicas Inteligentes',
    description: 'Receba alertas automáticos e dicas baseadas no seu comportamento financeiro para poupar mais.',
    icon: 'lightbulb-on'
  }
];

export const OnboardingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const renderItem = ({ item, index }: any) => {
    if (index !== currentIndex) return null;

    return (
      <View style={[styles.slide, { width }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
          <Icon name={item.icon} size={100} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      />
      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentIndex ? colors.accent : colors.border },
                i === currentIndex && { width: 24 }
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.accent }]}
          onPress={handleNext}
        >
          <Text style={styles.btnText}>
            {currentIndex === SLIDES.length - 1 ? 'Começar!' : 'Próximo'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  iconContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    padding: 30,
    paddingBottom: 50,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  btn: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
