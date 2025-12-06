import {createApp} from 'vue'
import App from './App.vue'
import router from './router'
import {createVuetify} from './plugins/vuetify'
import axios from 'axios'
import './assets/main.css'

export const API_ENDPOINT = `api`;

if (import.meta.env.MODE === 'development') {
    // Start mocks before app creation to avoid hitting proxy/back-end during initial fetches
    const {startDevMocks} = await import('./mocks/devMocks')
    startDevMocks()
}

const app = createApp(App)

const http = axios.create({
    baseURL: '/map/'
});

app.config.globalProperties.$http = http;

app.use(router)
app.use(createVuetify())
app.mount('#app')
