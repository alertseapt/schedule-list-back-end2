// ========================================
// CONFIGURAÇÃO CENTRALIZADA DA API
// ========================================
// 
// PARA ALTERAR O ENDPOINT DA API:
// Modifique apenas a linha abaixo:

const API_BASE_URL = 'https://schedule-mercocamp-api-production.up.railway.app/api'

// ========================================

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  // Endpoints específicos podem ser adicionados aqui se necessário
  ENDPOINTS: {
    AUTH: `${API_BASE_URL}/auth`,
    USERS: `${API_BASE_URL}/users`,
    SCHEDULES: `${API_BASE_URL}/schedules`,
    SETTINGS: `${API_BASE_URL}/user-settings`
  }
}

// Para compatibilidade com código existente
export const BASE_URL = API_BASE_URL

// Disponibilizar globalmente para arquivos que não usam módulos ES6
if (typeof window !== 'undefined') {
  window.API_CENTRALIZED_CONFIG = API_CONFIG
}

export default API_CONFIG