const AVATAR_COLORS = ['#2563EB', '#F97316', '#16A34A', '#DC2626', '#64748B', '#9333EA', '#0EA5E9'];

export function generateAvatarColor(name: string | null | undefined): string {
  const safeName = name && name.trim().length > 0 ? name : '؟';

  let hash = 0;
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
