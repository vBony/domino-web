import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const SERVER_URL = import.meta.env.VITE_SERVER_URL


const app = createApp(App)

app.use(router)

app.mount('#app')
