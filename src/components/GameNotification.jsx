import { useEffect } from "react";
import "./GameNotification.css";

function GameNotification({ notification }) {
  useEffect(() => {
    if (!notification) return undefined;

    const duration = notification.type === "levelUp" ? 5000 : 3000;
    const timeoutId = setTimeout(notification.onDismiss, duration);
    return () => clearTimeout(timeoutId);
  }, [notification]);

  if (!notification) return null;

  return (
    <div
      className={`game-notification notification-${notification.type}`}
      role="status"
      aria-live="polite"
    >
      {notification.message}
    </div>
  );
}

export default GameNotification;
