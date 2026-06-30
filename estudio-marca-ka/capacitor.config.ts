import type { CapacitorConfig } from '@capacitor/cli'

// Empacotamento iOS/Android (Fase 5). O `webDir` aponta para o build do Vite.
const config: CapacitorConfig = {
  appId: 'com.kellyalbert.estudio',
  appName: 'Estudio de Marca',
  webDir: 'dist',
}

export default config
