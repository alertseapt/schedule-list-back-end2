// main.js atualizado conforme documentação da API
const { createApp } = Vue

class VueApiClient {
    constructor() {
    this.baseURL = 'http://localhost:4000/api'
    this.token = localStorage.getItem('token')
    this.cache = new Map()
    this.pendingRequests = new Map()
    this.cacheTTL = {
      '/schedules': 30000,    // 30 segundos para agendamentos
      '/clients': 300000,     // 5 minutos para clientes
      '/user-settings': 300000, // 5 minutos para configurações
      'default': 60000        // 1 minuto padrão
    }
    }

    async request(endpoint, options = {}) {
    // Apenas métodos GET são cacheáveis
    const isCacheable = !options.method || options.method.toUpperCase() === 'GET'
    const cacheKey = isCacheable ? this.generateCacheKey(endpoint, options) : null
    
    // Verificar cache existente
    if (isCacheable && this.isCacheValid(cacheKey)) {
      console.log(`🚀 Cache HIT: ${endpoint}`)
      return this.cache.get(cacheKey).data
    }
    
    // Verificar requisição pendente (deduplicação)
    if (isCacheable && this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Aguardando requisição pendente: ${endpoint}`)
      return this.pendingRequests.get(cacheKey)
    }
    
    const promise = this.makeRequest(endpoint, options)
    
    // Armazenar requisição pendente
    if (isCacheable) {
      this.pendingRequests.set(cacheKey, promise)
    }
    
    try {
      const result = await promise
      
      // Armazenar no cache
      if (isCacheable) {
        this.storeInCache(cacheKey, result, endpoint)
        console.log(`💾 Cache MISS → Armazenado: ${endpoint}`)
      }
      
      return result
    } finally {
      // Remover da lista de pendentes
      if (isCacheable) {
        this.pendingRequests.delete(cacheKey)
      }
    }
  }

  generateCacheKey(endpoint, options) {
    return JSON.stringify({
      endpoint,
      params: options.params || {},
      query: options.query || {}
    })
  }

  isCacheValid(cacheKey) {
    if (!this.cache.has(cacheKey)) return false
    
    const cached = this.cache.get(cacheKey)
    const now = Date.now()
    return (now - cached.timestamp) < cached.ttl
  }

  storeInCache(cacheKey, data, endpoint) {
    const ttl = this.cacheTTL[endpoint] || this.cacheTTL.default
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  clearCache(endpoint = null) {
    if (endpoint) {
      // Limpar cache específico
      for (const [key] of this.cache) {
        if (key.includes(endpoint)) {
          this.cache.delete(key)
        }
      }
    } else {
      // Limpar todo o cache
      this.cache.clear()
    }
    console.log(`🗑️ Cache limpo: ${endpoint || 'todos'}`)
  }

  async makeRequest(endpoint, options) {
    const token = localStorage.getItem('token')
    const config = {
        headers: {
            'Content-Type': 'application/json',
      ...options.headers,
        },
    ...options,
    }
    if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
    }
    const url = `${this.baseURL}${endpoint}`

    const startTime = Date.now()
    let lastError = null
    while (Date.now() - startTime < 3000) { // tenta por até 3 segundos
    try {
      const response = await fetch(url, config)
      if (response.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = 'login.html'
        return
      }
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição')
      }
      return data
    } catch (error) {
      lastError = error
      // Retry imediatamente, sem delay
    }
    }
    // Se chegou aqui, todas as tentativas falharam em 3s
    throw lastError || new Error('Erro na requisição (timeout/retry)')
  }

  async login(user, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, password }),
    })
    const data = await response.json()
    if (response.ok) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      return data
    } else {
      throw new Error(data.error)
    }
  }

  async getUsers(params = {}) {
    return this.request(
      `/users?page=${params.page || 1}&limit=${params.limit || 10}&search=${params.search || ''}`
    )
  }

  async getProducts(params = {}) {
    return this.request(
      `/products?page=${params.page || 1}&limit=${params.limit || 10}&cli_cnpj=${params.cli_cnpj || ''}&supp_cnpj=${params.supp_cnpj || ''}&user_filter=${params.user_filter || ''}&search=${params.search || ''}`
    )
  }

    async getSchedules(params = {}) {
    return this.request(
      `/schedules?page=${params.page || 1}&limit=${params.limit || 10}&client=${params.client || ''}&status=${params.status || ''}&date_from=${params.date_from || ''}&date_to=${params.date_to || ''}&nfe_key=${params.nfe_key || ''}&number=${params.number || ''}`
    )
  }

  async createSchedule(scheduleData) {
        return this.request('/schedules', {
            method: 'POST',
      body: JSON.stringify(scheduleData),
    })
  }

  async updateScheduleStatus(scheduleId, status, comment) {
    return this.request(`/schedules/${scheduleId}/status`, {
            method: 'PATCH',
      body: JSON.stringify({
                status,
                historic_entry: {
          user: this.getCurrentUser()?.user,
                    action: `Status alterado para ${status}`,
          comment,
        },
      }),
    })
    }

    async createScheduleWithProducts(nfe_data) {
        return this.request('/schedules/create-with-products', {
            method: 'POST',
      body: JSON.stringify({ nfe_data }),
    })
    }

    getCurrentUser() {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
    }
}

const apiClient = new VueApiClient()

const app = createApp({
    data() {
        return {
      loading: true,
      user: null,
      schedules: [],
      users: [],
      products: [],
      error: null,
    }
  },
    async mounted() {
        try {
      await this.checkAuth()
      await this.loadSchedules()
        } catch (error) {
      this.error = error.message
        } finally {
      this.loading = false
        }
    },
    methods: {
        async checkAuth() {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
            if (!token || !userData) {
        window.location.href = 'login.html'
        return
            }
      this.user = JSON.parse(userData)
    },
    async loadSchedules() {
            try {
        const data = await apiClient.getSchedules()
        this.schedules = data.schedules || []
            } catch (error) {
        this.error = error.message
            }
        },
    async loadUsers() {
      try {
        const data = await apiClient.getUsers()
        this.users = data.users || []
            } catch (error) {
        this.error = error.message
            }
        },
    async loadProducts() {
            try {
        const data = await apiClient.getProducts()
        this.products = data.products || []
            } catch (error) {
        this.error = error.message
            }
        },
    async createSchedule(scheduleData) {
      try {
        await apiClient.createSchedule(scheduleData)
        await this.loadSchedules()
            } catch (error) {
        this.error = error.message
            }
        },
    async updateScheduleStatus(scheduleId, status, comment) {
      try {
        await apiClient.updateScheduleStatus(scheduleId, status, comment)
        await this.loadSchedules()
      } catch (error) {
        this.error = error.message
            }
        },
    async createScheduleWithProducts(nfe_data) {
      try {
        await apiClient.createScheduleWithProducts(nfe_data)
        await this.loadSchedules()
                    } catch (error) {
        this.error = error.message
            }
        },
    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = 'login.html'
    },
  },
})

window.VueApp = app
window.apiClient = apiClient
