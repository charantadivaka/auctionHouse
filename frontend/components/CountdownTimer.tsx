"use client";

import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';

export default function CountdownTimer({ 
  endTime, 
  className = '',
  iconClassName = '' 
}: { 
  endTime: string | Date, 
  className?: string,
  iconClassName?: string
}) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    if (!endTime) return;
    
    const end = new Date(endTime).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = end - now;

      if (distance < 0) {
        setIsEnded(true);
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (isEnded) {
    return (
      <span className={`flex items-center gap-1 font-bold text-gray-500 ${className}`}>
        Closed
      </span>
    );
  }

  if (!timeLeft) {
    return (
      <span className={`flex items-center gap-1 opacity-50 ${className}`}>
        <Clock className={`w-3 h-3 ${iconClassName}`} /> ...
      </span>
    );
  }

  const format = (num: number) => num.toString().padStart(2, '0');
  const isEndingSoon = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 60;

  if (timeLeft.days > 0) {
     return (
       <span className={`flex items-center gap-1 font-semibold text-gray-700 ${className}`}>
         <Clock className={`w-3 h-3 text-indigo-500 ${iconClassName}`} />
         {timeLeft.days}d {format(timeLeft.hours)}h
       </span>
     );
  }

  return (
    <span className={`flex items-center gap-1 tabular-nums font-semibold ${isEndingSoon ? 'text-red-600 animate-pulse' : 'text-gray-700'} ${className}`}>
      {isEndingSoon ? (
        <Zap className={`w-3 h-3 text-red-500 ${iconClassName}`} />
      ) : (
        <Clock className={`w-3 h-3 text-indigo-500 ${iconClassName}`} />
      )}
      {format(timeLeft.hours)}:{format(timeLeft.minutes)}:{format(timeLeft.seconds)}
    </span>
  );
}
