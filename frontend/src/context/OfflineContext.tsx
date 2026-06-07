import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineService } from '../services/offlineService';
import { transactionService } from '../services/transactionService';
import { Alert } from 'react-native';

interface OfflineContextType {
  isOnline: boolean;
  syncing: boolean;
  syncQueue: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);
      
      if (online) {
        syncQueue();
      }
    });

    return () => unsubscribe();
  }, []);

  const syncQueue = async () => {
    const queue = await offlineService.getQueue();
    if (queue.length === 0 || syncing) return;

    console.log(`Iniciando sincronização de ${queue.length} itens...`);
    setSyncing(true);

    let successCount = 0;
    for (const item of queue) {
      try {
        const { offline_id, ...transactionData } = item;
        await transactionService.createTransaction(transactionData);
        await offlineService.removeItemFromQueue(offline_id);
        successCount++;
      } catch (error) {
        console.error('Erro ao sincronizar item:', error);
        // Se falhou por erro de validação (400), removemos para não travar a fila
        // Se falhou por rede, paramos o loop e tentamos depois
        if ((error as any).response) {
            await offlineService.removeItemFromQueue(item.offline_id);
        } else {
            break; 
        }
      }
    }

    if (successCount > 0) {
      Alert.alert('Sincronização', `${successCount} transações pendentes foram enviadas com sucesso!`);
    }
    
    setSyncing(false);
  };

  return (
    <OfflineContext.Provider value={{ isOnline, syncing, syncQueue }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline deve ser usado dentro de OfflineProvider');
  }
  return context;
};
