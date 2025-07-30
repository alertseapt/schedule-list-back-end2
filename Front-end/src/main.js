import { createApp } from 'vue'
import App from './App.vue'
import axios from 'axios'

// Importar estilos
import './assets/css/main.css'
import './assets/css/vue-components.css'

// Configurar axios defaults
axios.defaults.baseURL = 'https://schedule-mercocamp-back-end.up.railway.app/api'

// Função para verificar nível de acesso antes de inicializar a app
async function checkUserAccessLevel() {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken')
  
  if (!token) {
    // Sem token, redirecionar para login
    window.location.href = 'login.html'
    return false
  }

  try {
    const response = await axios.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.user.level_access === 9) {
      // Usuário nível 9 deve ir para página de verificação
      window.location.href = 'schedule-verification.html'
      return false
    }

    return true
  } catch (error) {
    console.error('Erro na verificação de acesso:', error)
    // Token inválido, redirecionar para login
    localStorage.removeItem('token')
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.location.href = 'login.html'
    return false
  }
}

// Inicializar aplicação apenas se usuário tiver acesso correto
checkUserAccessLevel().then(canAccess => {
  if (canAccess) {
    // Tornar axios disponível globalmente
    const app = createApp(App)
    app.config.globalProperties.$http = axios
    app.mount('#app')
  }
})
