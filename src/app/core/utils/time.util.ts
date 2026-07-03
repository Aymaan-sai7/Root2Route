/** بيرجع نص عربي بسيط زي "من 5 دقايق" أو "امبارح" بناءً على تاريخ ISO */
export function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diffMs / 1000);

  if (sec < 60) return 'دلوقتي';

  const min = Math.floor(sec / 60);
  if (min < 60) return `من ${min} ${min === 1 ? 'دقيقة' : 'دقايق'}`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `من ${hr} ${hr === 1 ? 'ساعة' : 'ساعات'}`;

  const day = Math.floor(hr / 24);
  if (day === 1) return 'امبارح';
  if (day < 7) return `من ${day} أيام`;

  return new Date(dateStr).toLocaleDateString('ar-EG');
}
