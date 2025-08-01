// auth-guard.js atualizado conforme documentação da API
class AuthGuard {
    constructor() {
    this.apiBaseUrl = 'http://localhost:4000/api'
    this.init()
    }
    init() {
    this.checkAuthentication()
    }
    async checkAuthentication() {
    const token = localStorage.getItem('token')
        if (!token) {
      this.redirectToLogin()
      return
        }
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
                method: 'GET',
                headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
            if (response.ok) {
        const data = await response.json()
        
        // Verificar se usuário tem nível 9 e está na página errada
        if (data.user.level_access === 9) {
          // Se está tentando acessar o dashboard mas tem nível 9, redirecionar
          if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            window.location.href = '/schedule-verification.html'
            return
          }
        }
        
        // Token válido
        this.initializeDashboard()
            } else {
        this.handleInvalidToken()
            }
    } catch (error) {
      this.handleInvalidToken()
    }
}
  handleInvalidToken() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    this.redirectToLogin()
  }
  redirectToLogin() {
    window.location.href = '/login.html'
  }
  initializeDashboard() {
    // Pode adicionar lógica extra aqui se necessário
  }
}
// DESABILITADO para evitar conflito com main.js
// document.addEventListener('DOMContentLoaded', () => {
//   new AuthGuard()
// })
window.AuthGuard = AuthGuard
