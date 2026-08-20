import defaultConfig from 'tailwindcss/defaultConfig'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Outfit', ...defaultConfig.theme.fontFamily.sans]
      }
    }
  },
  plugins: []
}
