import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuração de como as notificações aparecem quando o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as any),
});

export const notificationService = {
  /**
   * Pede permissão para enviar notificações
   */
  async requestPermissions() {
    if (Platform.OS === 'web') return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permissão de notificação negada!');
      return false;
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  },

  /**
   * Agenda lembretes para uma conta a pagar.
   *
   * Agenda dois lembretes:
   *  - 1 dia antes do vencimento às 09:00h (aviso antecipado)
   *  - No próprio dia do vencimento às 09:00h (lembrete final)
   *
   * @param title         Descrição da conta
   * @param value         Valor formatado (ex: "150,00")
   * @param dueDate       Data de vencimento
   * @param transactionId ID da transação para referência
   * @returns Array com os IDs das notificações agendadas (pode ter 0, 1 ou 2)
   */
  async scheduleBillReminder(
    title: string,
    value: string,
    dueDate: Date,
    transactionId: number,
    chosenTime?: Date
  ): Promise<string[]> {
    if (Platform.OS === 'web') return [];

    const now = new Date();
    const scheduledIds: string[] = [];

    // Horários customizados ou 9h por padrão
    const targetHours = chosenTime ? chosenTime.getHours() : 9;
    const targetMinutes = chosenTime ? chosenTime.getMinutes() : 0;

    // ── Lembrete 1: DIA ANTERIOR (D-1) ─────────────────
    const reminderDayBefore = new Date(dueDate);
    reminderDayBefore.setDate(reminderDayBefore.getDate() - 1);
    reminderDayBefore.setHours(targetHours, targetMinutes, 0, 0);

    if (reminderDayBefore > now) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📅 Conta vence amanhã!',
            body: `"${title}" de R$ ${value} vence amanhã. Prepare o pagamento!`,
            data: { transactionId },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDayBefore,
            channelId: 'default',
          },
        });
        scheduledIds.push(id);
        console.log(
          `[Notificação] Lembrete D-1 agendado para: ${reminderDayBefore.toLocaleString('pt-BR')}`
        );
      } catch (err) {
        console.warn('[Notificação] Falha ao agendar aviso D-1:', err);
      }
    }

    // ── Lembrete 2: DIA DO VENCIMENTO (D) ──────────────────────────────
    const reminderOnDueDay = new Date(dueDate);
    reminderOnDueDay.setHours(targetHours, targetMinutes, 0, 0);

    if (reminderOnDueDay > now) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Conta vence hoje!',
            body: `"${title}" de R$ ${value} vence hoje. Não esqueça de pagar!`,
            data: { transactionId },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderOnDueDay,
            channelId: 'default',
          },
        });
        scheduledIds.push(id);
        console.log(
          `[Notificação] Lembrete no vencimento agendado para: ${reminderOnDueDay.toLocaleString('pt-BR')}`
        );
      } catch (err) {
        console.warn('[Notificação] Falha ao agendar lembrete do vencimento:', err);
      }
    }

    // ── Lembrete 3: DIA SEGUINTE (D+1) ─────────────────
    const reminderDayAfter = new Date(dueDate);
    reminderDayAfter.setDate(reminderDayAfter.getDate() + 1);
    reminderDayAfter.setHours(targetHours, targetMinutes, 0, 0);

    if (reminderDayAfter > now) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Conta vencida!',
            body: `"${title}" de R$ ${value} venceu ontem. Não esqueça de pagar!`,
            data: { transactionId },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDayAfter,
            channelId: 'default',
          },
        });
        scheduledIds.push(id);
        console.log(
          `[Notificação] Lembrete D+1 agendado para: ${reminderDayAfter.toLocaleString('pt-BR')}`
        );
      } catch (err) {
        console.warn('[Notificação] Falha ao agendar aviso D+1:', err);
      }
    }

    return scheduledIds;
  },

  /**
   * Cancela todos os lembretes agendados para uma transação específica.
   */
  async cancelReminderForTransaction(transactionId: number) {
    if (Platform.OS === 'web') return;
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.content.data && notif.content.data.transactionId === transactionId) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
          console.log(`[Notificação] Lembrete ${notif.identifier} para transação ${transactionId} cancelado.`);
        }
      }
    } catch (err) {
      console.warn('[Notificação] Falha ao cancelar lembretes para transação:', err);
    }
  },

  /**
   * Cancela um lembrete específico pelo ID retornado no agendamento.
   * @param notificationId ID retornado por scheduleNotificationAsync
   */
  async cancelReminder(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`[Notificação] Lembrete ${notificationId} cancelado.`);
    } catch (err) {
      console.warn('[Notificação] Falha ao cancelar lembrete:', err);
    }
  },

  /**
   * Cancela todos os lembretes agendados (útil no logout).
   */
  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
