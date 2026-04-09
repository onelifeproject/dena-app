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
    <div className="text-center mb-6" style={{ marginTop: '-1rem' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', display: 'inline-block', padding: '0.4rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-subtle)' }}>
         <span style={{ opacity: 0.8 }}>আজ: </span> 
         <span className="text-gradient font-bold">{formatDate}</span> 
         <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>|</span> 
         <span className="text-pure font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime}</span>
      </p>
    </div>
  );
}
