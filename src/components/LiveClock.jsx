import { useState, useEffect } from 'react';

export default function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = new Intl.DateTimeFormat('bn-BD', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(currentTime);

  const formatTime = new Intl.DateTimeFormat('bn-BD', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(currentTime);

  return (
    <div className="text-center mb-6 px-2" style={{ marginTop: '-1rem' }}>
      <div className="text-sm font-medium clock-wrapper" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-subtle)' }}>
         <span style={{ opacity: 0.8, whiteSpace: 'nowrap' }}>আজ: </span> 
         <span className="text-gradient font-bold" style={{ whiteSpace: 'nowrap' }}>{formatDate}</span> 
         <span className="clock-divider" style={{ opacity: 0.5 }}>|</span> 
         <span className="text-pure font-bold" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatTime}</span>
      </div>
    </div>
  );
}
