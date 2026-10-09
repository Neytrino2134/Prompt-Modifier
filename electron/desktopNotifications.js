// The renderer owns audio feedback. Use one silent OS notification transport.
export function showDesktopNotification({ Notification, tray, title, message, type, icon, onClick }) {
  try {
    if (Notification?.isSupported()) {
      const notification = new Notification({ title: String(title), body: String(message), icon, silent: true });
      notification.on('click', onClick);
      notification.show();
      return;
    }
  } catch (error) {
    console.warn('Native notification failed:', error);
  }

  if (tray && !tray.isDestroyed()) {
    try {
      tray.displayBalloon({
        title: String(title), content: String(message),
        iconType: type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info',
        noSound: true
      });
    } catch { /* The fallback is unavailable on some platforms. */ }
  }
}
