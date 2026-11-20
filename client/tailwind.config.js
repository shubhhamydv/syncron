/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        status: {
          working: '#059669',
          weeklyOff: '#64748b',
          leave: '#d97706',
          compOff: '#7c3aed',
          holidayOff: '#0284c7',
          notScheduled: '#78716c',
          gap: '#e11d48',
          partial: '#ea580c',
          ok: '#16a34a',
        }
      },
    },
  },
  plugins: [],
}
