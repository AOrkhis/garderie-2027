import '@fontsource-variable/nunito/index.css'
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { definirSurDeconnexion } from './api/client'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

definirSurDeconnexion(() => {
  useAuthStore().deconnexion()
  router.push({ path: '/connexion', query: { expire: '1' } })
})

app.mount('#app')
