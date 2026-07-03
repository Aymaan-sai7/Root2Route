/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F7F9FC',
        },
        ink: {
          DEFAULT: '#0F172A',
          soft: '#475569',
        },
        primary: {
          DEFAULT: '#2563EB',
          deep: '#1D4ED8',
          light: '#DBEAFE',
        },
        accent: {
          DEFAULT: '#F97316',
          deep: '#EA580C',
          light: '#FFEDD5',
        },
        steel: {
          DEFAULT: '#64748B',
          light: '#94A3B8',
        },
        line: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
        },
        success: '#16A34A',
        danger: '#DC2626',

        // أسماء قديمة محتفظ بيها كـ "أسماء بديلة" (aliases) عشان الكود القديم
        // اللي بيستخدم paper/blueprint/signal يفضل شغال بدون تعديل كل الملفات.
        paper: {
          DEFAULT: '#FFFFFF',
          dim: '#F7F9FC',
        },
        blueprint: {
          DEFAULT: '#2563EB',
          deep: '#1D4ED8',
          light: '#60A5FA',
        },
        signal: {
          DEFAULT: '#F97316',
          deep: '#EA580C',
          light: '#FB923C',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"IBM Plex Sans Arabic"', 'sans-serif'],
        'display-ar': ['"IBM Plex Sans Arabic"', '"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', '"IBM Plex Sans Arabic"', 'sans-serif'],
        'body-ar': ['"IBM Plex Sans Arabic"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
        lifted: '0 8px 28px rgba(15, 23, 42, 0.12)',
      },
      maxWidth: {
        content: '1240px',
      },
    },
  },
  plugins: [],
}
