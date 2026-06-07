import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { VictoryPie, VictoryChart, VictoryLine, VictoryTheme, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory-native';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/helpers';

const screenWidth = Dimensions.get('window').width;

interface ChartData {
    name: string;
    value: number;
    color?: string;
}

interface EvolutionData {
    month: string;
    balance: number;
}

interface DailyFlowItem {
    day: number;
    label: string;
    income: number;
    expense: number;
    balance: number;
}

interface DashboardChartsProps {
    pieData: ChartData[];
    evolutionData: EvolutionData[];
    dailyFlowData?: DailyFlowItem[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ pieData, evolutionData, dailyFlowData = [] }) => {
    const { colors } = useTheme();

    const formatBRLTick = (value: number): string => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const chartPieData = pieData.map(d => ({
        x: d.name,
        y: d.value,
        fill: d.color || colors.accent
    }));

    const chartEvolutionData = evolutionData.map(d => ({
        x: d.month,
        y: d.balance
    }));

    // Evita bug do VictoryChart quando todos os valores do eixo Y são iguais (ex: tudo zero)
    const evoBalances = evolutionData.map(d => d.balance);
    const minEvo = evoBalances.length > 0 ? Math.min(...evoBalances) : 0;
    const maxEvo = evoBalances.length > 0 ? Math.max(...evoBalances) : 0;
    const evoYDomain: [number, number] | undefined = minEvo === maxEvo
        ? [minEvo - 100, maxEvo + 100]
        : undefined;

    const dailyBalances = dailyFlowData.map(d => d.balance);
    const minDaily = dailyBalances.length > 0 ? Math.min(...dailyBalances) : 0;
    const maxDaily = dailyBalances.length > 0 ? Math.max(...dailyBalances) : 0;
    const dailyYDomain: [number, number] | undefined = minDaily === maxDaily
        ? [minDaily - 100, maxDaily + 100]
        : undefined;

    return (
        <View style={styles.container}>
            {/* PIE CHART */}
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Distribuição de Gastos</Text>
                {pieData.length > 0 ? (
                    <View style={styles.pieContainer}>
                        <VictoryPie
                            data={chartPieData}
                            width={screenWidth - 80}
                            height={380}
                            innerRadius={60}
                            padAngle={2}
                            labelRadius={({ innerRadius }) => (typeof innerRadius === 'number' ? innerRadius + 30 : 90)}
                            colorScale={pieData.map(d => d.color || colors.accent)}
                            style={{
                                labels: { fill: colors.text, fontSize: 10, fontWeight: 'bold' }
                            }}
                            animate={{ duration: 1000 }}
                        />
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sem dados de gastos este mês</Text>
                    </View>
                )}
            </View>

            {/* LINE CHART */}
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Evolução do Saldo</Text>
                {evolutionData.length > 0 ? (
                    <VictoryChart
                        width={screenWidth - 72}
                        height={350}
                        padding={{ top: 35, bottom: 50, left: 85, right: 20 }}
                        domainPadding={{ y: [25, 20], x: [10, 10] }}
                        domain={evoYDomain ? { y: evoYDomain } : undefined}
                        theme={VictoryTheme.material}
                        containerComponent={
                            <VictoryVoronoiContainer
                                labels={({ datum }) => `${datum.x}\n${formatCurrency(datum.y)}`}
                                labelComponent={<VictoryTooltip cornerRadius={10} flyoutStyle={{ fill: colors.surface, stroke: colors.accent }} style={{ fill: colors.text }} />}
                            />
                        }
                    >
                        <VictoryAxis
                            crossAxis={false}
                            style={{
                                axis: { stroke: colors.border },
                                tickLabels: { fill: colors.textMuted, fontSize: 10, angle: -20, textAnchor: 'end' },
                                grid: { stroke: 'transparent' }
                            }}
                        />
                        <VictoryAxis
                            dependentAxis
                            tickCount={5}
                            style={{
                                axis: { stroke: 'transparent' },
                                tickLabels: { fill: colors.textMuted, fontSize: 10 },
                                grid: { stroke: colors.borderLight, strokeDasharray: '4,4' }
                            }}
                            tickFormat={formatBRLTick}
                        />
                        <VictoryLine
                            data={chartEvolutionData}
                            style={{
                                data: { stroke: colors.accent, strokeWidth: 4 }
                            }}
                            animate={{ duration: 2000, onLoad: { duration: 1000 } }}
                            interpolation="monotoneX"
                        />
                    </VictoryChart>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Faltam dados de saldo anterior para gerar o gráfico</Text>
                    </View>
                )}
            </View>

            {/* DAILY LINE CHART (RF28) */}
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.chartTitle, { color: colors.text }]}>Fluxo de Caixa Diário</Text>
                {dailyFlowData.length > 0 ? (
                    <>
                        <VictoryChart
                            width={screenWidth - 72}
                            height={250}
                            padding={{ top: 35, bottom: 40, left: 85, right: 20 }}
                            domainPadding={{ y: [25, 20], x: [10, 10] }}
                            domain={dailyYDomain ? { y: dailyYDomain } : undefined}
                            theme={VictoryTheme.material}
                            containerComponent={
                                <VictoryVoronoiContainer
                                    labels={({ datum }) => `Dia ${datum.x}\nSaldo: ${formatCurrency(datum.y)}`}
                                    labelComponent={<VictoryTooltip cornerRadius={10} flyoutStyle={{ fill: colors.surface, stroke: '#4CAF50' }} style={{ fill: colors.text }} />}
                                />
                            }
                        >
                            <VictoryAxis
                                crossAxis={false}
                                style={{
                                    axis: { stroke: colors.border },
                                    tickLabels: { fill: colors.textMuted, fontSize: 10 },
                                    grid: { stroke: 'transparent' }
                                }}
                                tickFormat={(x) => (x % 5 === 0 || x === 1 ? `${x}` : '')}
                            />
                            <VictoryAxis
                                dependentAxis
                                tickCount={5}
                                style={{
                                    axis: { stroke: 'transparent' },
                                    tickLabels: { fill: colors.textMuted, fontSize: 10 },
                                    grid: { stroke: colors.borderLight, strokeDasharray: '4,4' }
                                }}
                                tickFormat={formatBRLTick}
                            />
                            <VictoryLine
                                data={dailyFlowData.map(d => ({ x: d.day, y: d.balance }))}
                                style={{
                                    data: { stroke: '#4CAF50', strokeWidth: 3 }
                                }}
                                animate={{ duration: 1500, onLoad: { duration: 800 } }}
                                interpolation="monotoneX"
                            />
                        </VictoryChart>
                        <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: -10 }}>
                            Saldo acumulado dia a dia no mês
                        </Text>
                    </>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sem movimentações registradas neste mês</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
        paddingHorizontal: 12,
        alignSelf: 'center',
        width: '100%',
    },
    chartCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    pieContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
    }
});
