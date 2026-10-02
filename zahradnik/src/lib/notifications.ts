import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Naplánuje denní připomínku v zadanou hodinu. Vrací false, pokud uživatel nepovolil oznámení. */
export async function scheduleDailyReminder(hour: number, plantCount: number): Promise<boolean> {
  const perm = await Notifications.getPermissionsAsync();
  let granted = perm.granted;
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('denni-rady', {
      name: 'Denní rady',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌱 Dobré ráno, zahradníku!',
      body:
        plantCount > 0
          ? `Podívej se, jestli dnes tvých ${plantCount} rostlin potřebuje zálivku, a přečti si tip dne.`
          : 'Přidej si rostliny a já ti každý den poradím, jak se o ně starat.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      channelId: 'denni-rady',
    },
  });
  return true;
}

export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
