import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { formatCurrency } from '../utils/helpers';

interface CategoryBarProps {
    name: string;
    value: number;
    percentage: number;
    icon?: string;
    color?: string;
    categoryId?: number;
    onPress?: (categoryId: number, categoryName: string) => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
    name,
    value,
    percentage,
    icon,
    color,
    categoryId,
    onPress
}) => {
    const themeColor = color || '#FF8C00';

    const getCategoryIcon = (name: string, savedIcon?: string): any => {
        if (savedIcon) return savedIcon;
        const n = name.toLowerCase();
        if (n.includes('moradia')) return 'home-city';
        if (n.includes('alimentação')) return 'food';
        if (n.includes('transporte')) return 'car-back';
        if (n.includes('saúde')) return 'heart-pulse';
        if (n.includes('lazer')) return 'controller-classic';
        if (n.includes('salário')) return 'bank-transfer-in';
        if (n.includes('renda extra')) return 'gift';
        if (n.includes('empréstimo')) return 'bank';
        return 'tag';
    };

    return (
        <TouchableOpacity 
            onPress={() => categoryId && onPress && onPress(categoryId, name)}
            activeOpacity={0.7}
        >
            <View style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                    <View style={styles.nameRow}>
                        <View style={[styles.iconBox, { backgroundColor: themeColor + '15' }]}>
                            <Icon name={getCategoryIcon(name, icon)} size={18} color={themeColor} />
                        </View>
                        <Text style={styles.categoryName}>{name}</Text>
                    </View>
                    <Text style={styles.categoryValue}>{formatCurrency(value)}</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { width: `${percentage}%`, backgroundColor: themeColor }
                        ]}
                    />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    categoryItem: { marginBottom: 20 },
    categoryInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    categoryValue: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A' },
    progressBarBg: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4 },
    progressBarFill: { height: 8, borderRadius: 4 },
});
