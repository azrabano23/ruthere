import { useEffect, useState } from 'react';
import { onEvent, describeEvent } from '../lib/realtime.js';

/** Toasts for live events aimed at this person (a cancelled trip, a group change) wherever they are in the app. */
export default function LiveNotices() {
  const [notices, setNotices] = useState([]);

  useEffect(() => onEvent((e) => {
    if (e.channel !== 'notice') return;
    const text = describeEvent(e);
    if (!text) return;
    const id = `${e.type}-${e.at}`;
    setNotices((n) => [...n, { id, text }]);
    setTimeout(() => setNotices((n) => n.filter((x) => x.id !== id)), 8000);
  }), []);

  if (notices.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {notices.map((n) => <div key={n.id} className="toast">{n.text}</div>)}
    </div>
  );
}
