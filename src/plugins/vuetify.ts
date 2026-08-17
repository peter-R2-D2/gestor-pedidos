import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#F57C00', // naranja restaurante
          secondary: '#00695C',
          accent: '#FFB74D',
          error: '#C62828',
          info: '#0277BD',
          success: '#2E7D32',
          warning: '#EF6C00',
          orange: '#EF6C00',
          teal: '#00796B',
          background: '#F6F4F0',
          surface: '#FFFFFF',
        },
      },
    },
  },
  defaults: {
    global: {
      // Controles más grandes y cómodos para uso en tablet
      VBtn: { size: 'large' },
      VTextField: { variant: 'outlined' },
    },
  },
})
