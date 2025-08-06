<template>
  <div id="app">
    <!-- Loading Screen -->
    <div v-if="loading" class="loading-screen">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Carregando dashboard...</p>
      </div>
    </div>

    <!-- Main App -->
    <div v-else class="container">
      <!-- Sidebar Component -->
      <SidebarComponent
        :user="user"
        :active-menu="activeMenu"
        @menu-click="handleMenuClick"
        @logout="handleLogout"
      >
      </SidebarComponent>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Dashboard Content -->
        <div v-if="!showSchedulesList && !showSettingsPage && !showXmlUploadPage" class="content-area">
          <!-- Stats Cards -->
          <StatsCards :stats="dashboardStats" :loading="statsLoading">
          </StatsCards>

          <!-- Tabela de Agendamentos (transferida de SchedulesList.vue) -->
          <div class="schedules-list">
            <!-- Header -->
            <div class="page-header">
              <h2>Lista de Agendamentos</h2>
              <div class="header-actions">
                <button
                  v-if="hasCreatePermission"
                  class="btn btn-primary"
                  @click="openScheduleCreationModal"
                  :disabled="loading"
                  title="Criar novo agendamento"
                >
                  <i class="fas fa-plus"></i>
                  Criar Agendamento
                </button>
                <button
                  v-if="canCreateBooking"
                  class="btn btn-outline-primary"
                  @click="openBookingModal"
                  :disabled="loading"
                  title="Criar agendamento de marcação"
                >
                  <i class="fas fa-calendar-plus"></i>
                  Marcação
                </button>
                <button
                  class="btn btn-outline-primary"
                  @click="refresh"
                  :disabled="loading"
                  title="Atualizar dados"
                >
                  <i :class="loading ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'"></i>
                  Atualizar
                </button>
              </div>
            </div>

            <!-- Filtros -->
            <ScheduleFilters 
              :filters="currentFilters" 
              :status-options="statusOptions"
              :available-clients="availableClients"
              @filters-changed="handleFiltersChanged"
              @reset-filters="handleResetFilters"
            />

            <!-- Bulk Actions Bar -->
            <div v-if="canBulkManage" class="bulk-actions-bar">
              <div class="selected-info">
                <button class="btn btn-outline-secondary action-btn selection-btn" @click="clearSelection">
                  <i class="fas fa-times"></i> Limpar seleção
                  <span class="selection-badge">{{ selectedSchedules.length }}</span>
                </button>
              </div>
              
              <div class="bulk-actions">
                <!-- Actions for Contestado status -->
                <div v-if="selectedScheduleStatuses[0] === 'Contestado'" class="contestado-actions">
                  <div v-if="userLevel === 1" class="level-1-actions">
                    <button class="btn btn-success action-btn" @click="acceptNewDate" :disabled="bulkActionLoading">
                      <i class="fas fa-check"></i> Aceitar Nova Data
                    </button>
                    <span class="contact-text">Ou entre em contato com nossa equipe</span>
                  </div>
                  <div v-else class="non-level-1-actions">
                    <button class="btn btn-success action-btn" @click="confirmContestado" :disabled="bulkActionLoading">
                      <i class="fas fa-check"></i> Confirmar
                    </button>
                    <input type="date" v-model="newDate" class="form-control" :min="today" />
                    <button class="btn btn-success action-btn" @click="changeContestadoToAgendado" :disabled="!newDate || bulkActionLoading">
                      <i class="fas fa-calendar-alt"></i> Agendar
                    </button>
                  </div>
                </div>
                
                <!-- Actions for Solicitado status -->
                <div v-if="selectedScheduleStatuses[0] === 'Solicitado' && userLevel !== 1" class="solicitado-actions">
                  <button class="btn btn-success action-btn" @click="acceptSchedules" :disabled="bulkActionLoading">
                    <i class="fas fa-check"></i> Aceitar Agendamento
                  </button>
                  <input type="date" v-model="newDate" class="form-control" :min="today" />
                  <button class="btn btn-warning action-btn" @click="changeDateToContestado" :disabled="!newDate || bulkActionLoading">
                    <i class="fas fa-calendar-alt"></i> Alterar Data
                  </button>
                </div>
                
                <!-- Actions for Agendado status (non-level 1 users can mark as received) -->
                <div v-if="selectedScheduleStatuses[0] === 'Agendado' && userLevel !== 1" class="agendado-actions">
                  <button class="btn btn-success action-btn" @click="markAsReceived" :disabled="bulkActionLoading">
                    <i class="fas fa-check-circle"></i> Marcar como Em conferência
                  </button>
                </div>
                
                <!-- Actions for Conferência status (non-level 1 users can mark as Estoque) -->
                <div v-if="(selectedScheduleStatuses[0] === 'Conferência' || selectedScheduleStatuses[0] === 'Recebido') && userLevel !== 1" class="conferencia-actions">
                  <button class="btn btn-info action-btn" @click="markAsEstoque" :disabled="bulkActionLoading">
                    <i class="fas fa-warehouse"></i> Marcar como Em estoque
                  </button>
                </div>
                
                <!-- Actions for Cancelar status (non-level 1 users can accept cancellation requests from level 1) -->
                <div v-if="selectedScheduleStatuses[0] === 'Cancelar' && userLevel !== 1" class="cancelar-actions">
                  <button class="btn btn-danger action-btn btn-accept-cancel" @click="acceptCancellation" :disabled="bulkActionLoading">
                    <i class="fas fa-times-circle"></i> Aceitar Cancelamento
                  </button>
                  <span class="text-muted" style="font-size: 0.85em;">Solicitado por {{ cancelRequestedBy }}</span>
                </div>
                
                <!-- Universal Cancel Button (all users can cancel) -->
                <div v-if="selectedSchedules.length > 0 && !['Cancelar', 'Cancelado', 'Recusado', 'Estoque'].includes(selectedScheduleStatuses[0])" class="universal-actions">
                  <button class="btn btn-outline-danger action-btn" @click="cancelSchedules" :disabled="bulkActionLoading">
                    <i class="fas fa-ban"></i> 
                    {{ userLevel === 1 ? 'Solicitar Cancelamento' : 'Cancelar Agendamento' }}
                  </button>
                </div>
                
                <!-- Actions for Marcação status (non-level 1 users can delete booking schedules) -->
                <div v-if="selectedScheduleStatuses[0] === 'Marcação' && userLevel !== 1" class="marcacao-actions">
                  <button 
                    class="btn btn-danger action-btn" 
                    @click="deleteMarcacoes"
                    :disabled="bulkActionLoading"
                  >
                    <i class="fas fa-trash"></i> Excluir Marcações
                  </button>
                  <span class="text-muted" style="font-size: 0.85em;">
                    Excluir {{ selectedSchedules.length }} marcação(ões) selecionada(s)
                  </span>
                </div>
              </div>
            </div>

            <!-- Table -->
            <div class="table-container">
              <div v-if="loading" class="loading-container">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando agendamentos...</p>
              </div>
              <div v-else-if="schedules.length === 0" class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Nenhum agendamento encontrado</h3>
                <p>Não há agendamentos que correspondam aos filtros aplicados.</p>
              </div>
              <div v-else class="table-wrapper" @scroll="handleScroll" ref="tableWrapper">
                <table class="schedules-table">
                  <thead>
                    <tr>
                      <th style="width: 50px;">
                        
                      </th>
                      <th>N° NF-e</th>
                      <th>Cliente</th>
                      <th>Data de Entrega</th>
                      <th>Volumes</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="schedule in displayedSchedules" :key="schedule.id">
                      <td>
                        <input type="checkbox" :value="schedule.id" v-model="selectedSchedules" @change="onScheduleSelect" :disabled="!canSelectSchedule(schedule)" />
                      </td>
                      <td>{{ schedule.number }}</td>
                      <td>{{ schedule.client }}</td>
                      <td>{{ formatDate(schedule.date) }}</td>
                      <td>{{ schedule.case_count }}</td>
                      <td>
                        <span :class="'status-badge ' + getStatusBadge(schedule.status).class" class="status-badge">
                          {{ getStatusBadge(schedule.status).label }}
                        </span>
                      </td>
                      <td>
                        <div class="action-buttons">
                          <button class="btn btn-sm btn-outline-primary" @click="openInfoModal(schedule)" title="Mais informações">
                            <i class="fas fa-info-circle"></i>
                            Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                <!-- Loading indicator for infinite scroll -->
                <div v-if="loadingMore" class="loading-more">
                  <i class="fas fa-spinner fa-spin"></i>
                  <p>Carregando mais agendamentos...</p>
                </div>
              </div>
            </div>

            <!-- Modals -->
            <div v-if="showEditModal" style="color: red; font-weight: bold;">DEBUG: Modal de edição deveria estar visível</div>
            <NfeInfoModal 
              v-if="showInfoModal" 
              :nfe-data="selectedSchedule" 
              :show-modal="showInfoModal" 
              :user="user" 
              @close="closeInfoModal" 
              @edit="openEditModal" 
              @mark-tratativa="handleMarkSingleAsTratativa" 
              @change-status="handleChangeStatusFromTratativa"
              @reprocess-success="handleReprocessSuccess"
              @reprocess-toast="handleReprocessToast"
            />
            <ScheduleEditModal v-if="showEditModal" :schedule-data="scheduleToEdit" :show-modal="showEditModal" @close="closeEditModal" @updated="handleScheduleUpdated" @notification="addNotification" />
            <ScheduleCreationModal v-if="showScheduleCreationModal" :show-modal="showScheduleCreationModal" @close="closeScheduleCreationModal" @created="handleScheduleCreated" />
            <ScheduleBookingModal v-if="showBookingModal" :show-modal="showBookingModal" @close="closeBookingModal" @created="handleBookingCreated" />
          </div>
        </div>

        <!-- Schedules List -->
        <div v-if="showSchedulesList" class="content-area">
          <SchedulesList @notification="addNotification"> </SchedulesList>
        </div>

        <!-- Settings Page -->
        <div v-if="showSettingsPage" class="content-area">
          <SettingsPage @notification="addNotification"> </SettingsPage>
        </div>

        <!-- XML Upload Page -->
        <div v-if="showXmlUploadPage" class="content-area">
          <XmlUploadPage @notification="addNotification"> </XmlUploadPage>
        </div>
      </main>
    </div>

    <!-- Global Notifications -->
    <NotificationsComponent
      :notifications="notifications"
      @close="removeNotification"
    >
    </NotificationsComponent>
  </div>
</template>

<script>
import SidebarComponent from './components/SidebarComponent.vue'
import StatsCards from './components/StatsCards.vue'
import RecentActivities from './components/RecentActivities.vue'
import PendingDeliveries from './components/PendingDeliveries.vue'
import NotificationsComponent from './components/NotificationsComponent.vue'
import SchedulesList from './components/SchedulesList.vue'
import ScheduleFilters from './components/ScheduleFilters.vue'
import NfeInfoModal from './components/NfeInfoModal.vue'
import ScheduleEditModal from './components/ScheduleEditModal.vue'
import ScheduleCreationModal from './components/ScheduleCreationModal.vue'
import ScheduleBookingModal from './components/ScheduleBookingModal.vue'
import SettingsPage from './views/SettingsPage.vue'
import XmlUploadPage from './views/XmlUploadPage.vue'
import { checkPermission, checkUserLevel } from './utils/permissions.js'
import { BASE_URL } from './config/api.js'
import axios from 'axios'

// Função que inicializa e demonstra o sistema de permissões
function initializePermissions() {
  console.log('=== Sistema de Permissões ===')

  if (checkPermission('create_schedule')) {
    console.log('✅ Usuário pode criar agendamentos')
  } else {
    console.log('❌ Usuário não pode criar agendamentos')
  }

  if (checkPermission('manage_users')) {
    console.log('✅ Usuário pode gerenciar usuários')
  } else {
    console.log('❌ Usuário não pode gerenciar usuários')
  }

  if (checkUserLevel(0)) {
    console.log('✅ Usuário é desenvolvedor - acesso total')
  } else {
    console.log('❌ Usuário não é desenvolvedor')
  }

  if (checkUserLevel(2)) {
    console.log('✅ Usuário tem acesso administrativo')
  } else {
    console.log('❌ Usuário não tem acesso administrativo')
  }
}

// Usar o apiClient global já otimizado com cache (importado de main.js)
const apiClient = window.apiClient || new (class VueApiClientFallback {
  constructor() {
    this.baseURL = BASE_URL
    this.token = localStorage.getItem('token')
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token')

    const config = {
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await axios({
        ...config,
        url: endpoint,
      })
      return response.data
    } catch (error) {
      if (error.response?.status === 401) {
        // Não fazer logout automático para erros de alteração de senha
        // Esses erros devem ser tratados pelo próprio componente
        if (endpoint === '/users/profile/me') {
          throw error
        }
        
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        console.log('Token expirado, redirecionando para login')
        window.location.href = '/login.html'
        return
      }
      throw error
    }
  }

  async getDashboardStats() {
    return {
      pendingDeliveries: 7,
      processing: 23,
      completedToday: 156,
      divergences: 2,
    }
  }

  async getRecentActivities() {
    return [
      {
        id: 1,
        type: 'received',
        title: 'Produto em Conferência',
        description: 'Smartphone Samsung Galaxy - Código: 4587956321',
        time: '15 minutos atrás',
        status: 'success',
      },
      {
        id: 2,
        type: 'pending',
        title: 'Aguardando Conferência',
        description: 'Lote de Notebooks Dell - Pedido: PED-789654',
        time: '1 hora atrás',
        status: 'warning',
      },
      {
        id: 3,
        type: 'divergence',
        title: 'Divergência Detectada',
        description: 'Diferença na quantidade - Produto: MON-4578123',
        time: '2 horas atrás',
        status: 'danger',
      },
    ]
  }

  async getPendingDeliveries() {
    return [
      {
        id: 1,
        nfe: '35240414200166000182550010000134151123456789',
        supplier: 'TechCorp Ltda',
        volumes: '15 volumes',
        scheduledDate: '14/07/2025',
        warehouse: 'Estoque Principal',
        status: 'scheduled',
      },
      {
        id: 2,
        nfe: '35240414200166000182550010000134152234567890',
        supplier: 'SmartPhone Inc',
        volumes: '8 volumes',
        scheduledDate: '14/07/2025',
        warehouse: 'Estoque Eletrônicos',
        status: 'on_way',
      },
      {
        id: 3,
        nfe: '35240414200166000182550010000134153345678901',
        supplier: 'Office Solutions',
        volumes: '20 volumes',
        scheduledDate: '15/07/2025',
        warehouse: 'Estoque Periféricos',
        status: 'scheduled',
      },
      {
        id: 4,
        nfe: '35240414200166000182550010000134154456789012',
        supplier: 'Industrial Corp',
        volumes: '5 volumes',
        scheduledDate: '15/07/2025',
        warehouse: 'Estoque Industrial',
        status: 'processing',
      },
    ]
  }

  async getSchedules(params = {}) {
    return this.request('/schedules', { params })
  }

  async createSchedule(data) {
    return this.request('/schedules', {
      method: 'POST',
      data,
    })
  }

  async updateScheduleStatus(id, status, comment) {
    return this.request(`/schedules/${id}/status`, {
      method: 'PATCH',
      data: {
        status,
        historic_entry: {
          user: this.getCurrentUser()?.user || 'system',
          action: `Status alterado para ${status}`,
          comment,
        },
      },
    })
  }

  async createScheduleWithProducts(nfe_data) {
    return this.request('/schedules/create-with-products', {
      method: 'POST',
      data: { nfe_data },
    })
  }

  // User Settings endpoints
  async getUserSettings() {
    return this.request('/user-settings')
  }

  async updateUserSettings(settings) {
    return this.request('/user-settings', {
      method: 'PUT',
      data: settings,
    })
  }

  async updateEmailSettings(emailSettings) {
    return this.request('/user-settings/email', {
      method: 'PATCH',
      data: { emailSettings },
    })
  }

  async updateUISettings(uiSettings) {
    return this.request('/user-settings/ui', {
      method: 'PATCH',
      data: { uiSettings },
    })
  }

  async testEmailSettings() {
    return this.request('/user-settings/test-email', {
      method: 'POST',
    })
  }

  async resetUserSettings() {
    return this.request('/user-settings', {
      method: 'DELETE',
    })
  }

  // User Profile endpoints
  async updateProfile(profileData) {
    return this.request('/user/profile', {
      method: 'PUT',
      data: profileData,
    })
  }

  async changePassword(passwordData) {
    console.log('🔐 Tentando alterar senha:', passwordData)
    const token = localStorage.getItem('token') || localStorage.getItem('authToken')
    
    return this.request('/users/profile/me', {
      method: 'PUT',
      data: passwordData,
    })
  }

  getCurrentUser() {
    const userData = localStorage.getItem('user')
    return userData ? JSON.parse(userData) : null
  }
})()

// Manter compatibilidade para componentes filhos
if (!window.apiClient) {
  window.apiClient = apiClient
}

export default {
  name: 'App',
  components: {
    SidebarComponent,
    StatsCards,
    RecentActivities,
    PendingDeliveries,
    NotificationsComponent,
    SchedulesList,
    ScheduleFilters,
    NfeInfoModal,
    ScheduleEditModal,
    ScheduleCreationModal,
    ScheduleBookingModal,
    SettingsPage,
    XmlUploadPage,
  },

  data() {
    return {
      loading: true,
      user: null,
      activeMenu: 'dashboard',
      showSchedulesList: false,
      showSettingsPage: false,
      showXmlUploadPage: false,

      dashboardStats: {
        pendingDeliveries: 0,
        processing: 0,
        completedToday: 0,
        divergences: 0,
      },
      statsLoading: false,

      recentActivities: [],
      activitiesLoading: false,

      pendingDeliveries: [],
      deliveriesLoading: false,

      notifications: [],
      schedules: [],
      selectedSchedules: [],
      newDate: '',
      bulkActionLoading: false,
      showInfoModal: false,
      showEditModal: false,
      showScheduleCreationModal: false,
      showBookingModal: false,
      scheduleToEdit: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 1,
        hasMore: true,
      },
      loadingMore: false,
      selectedSchedule: null,
      
      // Filtros
      currentFilters: {
        status: '',
        client: '',
        date_from: '',
        date_to: '',
        nfe_number: '',
      },
      availableClients: []
    }
  },
  computed: {
    displayedSchedules() {
      if (!Array.isArray(this.schedules)) return []
      
      // Filtrar status que não devem aparecer na página inicial
      const hiddenStatuses = ['Estoque', 'Recusado', 'Cancelado']
      return this.schedules.filter(schedule => 
        !hiddenStatuses.includes(schedule.status)
      )
    },
    selectedScheduleStatuses() {
      const selected = (this.schedules || []).filter(s => (this.selectedSchedules || []).includes(s.id))
      return [...new Set(selected.map(s => s.status))]
    },
    cancelRequestedBy() {
      if (this.selectedSchedules.length === 0) return 'administrador'
      
      const selected = (this.schedules || []).filter(s => (this.selectedSchedules || []).includes(s.id))
      if (selected.length === 0) return 'administrador'
      
      const schedule = selected[0]
      if (!schedule.historic) return 'administrador'
      
      // Procurar no histórico por uma entrada de cancelamento
      const historicEntries = Object.values(schedule.historic)
      const cancelEntry = historicEntries.find(entry => 
        entry.action && entry.action.includes('Cancelar') || 
        entry.action && entry.action.includes('cancelamento')
      )
      
      return cancelEntry && cancelEntry.user ? cancelEntry.user : 'administrador'
    },
    canBulkManage() {
      return (this.selectedSchedules || []).length > 0 && this.selectedScheduleStatuses.length === 1
    },
    userLevel() {
      try {
        const userData = localStorage.getItem('user')
        if (!userData) return null
        const user = JSON.parse(userData)
        return user.level_access
      } catch (error) {
        return null
      }
    },
    today() {
      return new Date().toISOString().split('T')[0]
    },
    
    statusOptions() {
      return [
        { value: '', label: 'Todos os status' },
        { value: 'Solicitado', label: 'Solicitado' },
        { value: 'Contestado', label: 'Contestado' },
        { value: 'Agendado', label: 'Agendado' },
        { value: 'Conferência', label: 'Em conferência' },
        { value: 'Tratativa', label: 'Em tratativa' },
        { value: 'Estoque', label: 'Em estoque' },
        { value: 'Cancelar', label: 'Cancelar' },
        { value: 'Cancelado', label: 'Cancelado' },
        { value: 'Recusado', label: 'Recusado' },
      ]
    },
    
    hasCreatePermission() {
      const currentUser = this.user
      return currentUser && currentUser.level_access !== undefined && currentUser.level_access >= 0
    },

    canCreateBooking() {
      const currentUser = this.user
      return currentUser && currentUser.level_access !== 1
    },
  },
  async mounted() {
    console.log('🚀 App.vue montado');
    
    // Verificar autenticação
    await this.checkAuth();
    
    // Carregar dados iniciais
    await this.loadInitialData();
    
    
    // Inicializar permissões
    initializePermissions();
  },
  methods: {
    async checkAuth() {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      if (!token || !userData) {
        window.location.href = '/login.html'
        return
      }
      try {
        this.user = JSON.parse(userData)
      } catch (error) {
        console.error('Erro ao parsear dados do usuário:', error)
        window.location.href = '/login.html'
      }
    },

    async loadDashboardData() {
      const promises = [
        this.loadStats(),
        this.loadRecentActivities(),
        this.loadPendingDeliveries(),
      ]
      try {
      await Promise.all(promises)
        console.log('Dashboard carregado com sucesso!')
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error)
        this.addNotification('Erro ao carregar dashboard', 'error')
      }
    },

    async loadStats() {
      this.statsLoading = true
      try {
        console.log('Buscando estatísticas...')
        // Usar os agendamentos já carregados em vez de fazer nova requisição
        const schedules = this.schedules || []
        
        // Debug: verificar quais status estão presentes
        const uniqueStatuses = [...new Set(schedules.map(s => s.status))]
        console.log('Status únicos encontrados:', uniqueStatuses)
        console.log('Total de schedules:', schedules.length)
        
        this.dashboardStats = {
          solicitacoes: schedules.filter(s => s.status === 'Solicitado').length,
          agendamentos: schedules.filter(s => s.status === 'Agendado').length,
          conferencia: schedules.filter(s => s.status === 'Conferência' || s.status === 'Recebido').length,
          tratativa: schedules.filter(s => s.status === 'Tratativa').length,
        }
        console.log('Estatísticas carregadas:', this.dashboardStats)
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
        this.addNotification('Erro ao carregar estatísticas', 'error')
      } finally {
        this.statsLoading = false
      }
    },

    async loadRecentActivities() {
      this.activitiesLoading = true
      try {
        console.log('Buscando atividades recentes...')
        this.recentActivities = await apiClient.getRecentActivities()
        console.log('Atividades recentes carregadas:', this.recentActivities)
      } catch (error) {
        console.error('Erro ao carregar atividades:', error)
        this.addNotification('Erro ao carregar atividades recentes', 'error')
      } finally {
        this.activitiesLoading = false
      }
    },

    async loadPendingDeliveries() {
      this.deliveriesLoading = true
      try {
        console.log('Buscando entregas pendentes...')
        this.pendingDeliveries = await apiClient.getPendingDeliveries()
        console.log('Entregas pendentes carregadas:', this.pendingDeliveries)
      } catch (error) {
        console.error('Erro ao carregar entregas:', error)
        this.addNotification('Erro ao carregar entregas agendadas', 'error')
      } finally {
        this.deliveriesLoading = false
      }
    },

    handleMenuClick(menuId) {
      this.activeMenu = menuId
      console.log('Menu clicado:', menuId)

      this.showSchedulesList = false
      this.showSettingsPage = false
      this.showXmlUploadPage = false

      switch (menuId) {
        case 'dashboard':
          this.loadDashboardData()
          break
        case 'agendamento':
          this.showSchedulesList = true
          break
        case 'agendamento-lote':
          this.showXmlUploadPage = true
          break
        case 'configuracoes':
          this.showSettingsPage = true
          break
        default:
          console.log('Menu não implementado:', menuId)
      }
    },

    handleLogout() {
      const confirmed = confirm('Tem certeza que deseja sair?')
      if (confirmed) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login.html'
      }
    },

    async handleDeliveryAction(action, deliveryId) {
      console.log('Ação na entrega:', action, deliveryId)

      switch (action) {
        case 'start':
          try {
            await apiClient.updateScheduleStatus(
              deliveryId,
              'processing',
              'Recebimento iniciado'
            )
            this.addNotification('Recebimento iniciado', 'success')
            await this.loadPendingDeliveries()
          } catch (error) {
            this.addNotification('Erro ao iniciar recebimento', 'error')
          }
          break
        case 'track':
          this.addNotification('Abrindo rastreamento...', 'info')
          break
        case 'view':
          this.addNotification('Abrindo detalhes...', 'info')
          break
        default:
          this.addNotification('Ação não reconhecida', 'warning')
      }
    },

    addNotification(message, type = 'info') {
      const notification = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date(),
      }

      this.notifications.push(notification)

      setTimeout(() => {
        this.removeNotification(notification.id)
      }, 5000)
    },

    removeNotification(id) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index > -1) {
        this.notifications.splice(index, 1)
      }
    },

    async refresh() {
      await this.refreshPageAfterAction('Dados atualizados com sucesso')
    },
    async loadSchedules() {
      if (this.pagination.page === 1) {
        this.loading = true
      }
      
      try {
        console.log('Buscando agendamentos...')
        // Usar o apiClient global com cache
        const response = await apiClient.request('/schedules', {
          method: 'GET',
          params: {
            page: this.pagination.page,
            limit: this.pagination.limit,
            ...this.currentFilters
          }
        })
        
        const newSchedules = response.schedules || []
        
        if (this.pagination.page === 1) {
          this.schedules = newSchedules
        } else {
          this.schedules = [...this.schedules, ...newSchedules]
        }
        
        this.pagination.total = response.pagination?.total || 0
        this.pagination.hasMore = newSchedules.length === this.pagination.limit
        console.log('Agendamentos carregados:', this.schedules.length)
      } catch (error) {
        if (this.pagination.page === 1) {
          this.schedules = []
        }
        console.error('Erro ao carregar agendamentos:', error)
        this.addNotification('Erro ao carregar agendamentos', 'error')
      } finally {
        if (this.pagination.page === 1) {
          this.loading = false
        }
        console.log('Finalizou loading dos agendamentos')
      }
    },

    async loadSchedulesInBackground() {
      try {
        console.log('Carregando agendamentos em background...')
        // Usar o apiClient global com cache
        const response = await apiClient.getSchedules()
        this.schedules = response.schedules || []
        this.pagination.total = response.pagination?.total || this.schedules.length
        this.pagination.pages = response.pagination?.pages || Math.ceil(this.schedules.length / this.pagination.limit)
        console.log('Agendamentos carregados em background:', this.schedules.length)
      } catch (error) {
        this.schedules = []
        console.error('Erro ao carregar agendamentos em background:', error)
        this.addNotification('Erro ao carregar agendamentos', 'error')
      }
    },

    async loadDashboardDataInBackground() {
      try {
        console.log('Carregando dados do dashboard em background...')
        // Executar todas as requisições em paralelo
        const promises = [
          this.loadStatsInBackground(),
          this.loadRecentActivitiesInBackground(),
          this.loadPendingDeliveriesInBackground()
        ]
        
        await Promise.allSettled(promises)
        console.log('Dashboard carregado em background!')
      } catch (error) {
        console.error('Erro ao carregar dashboard em background:', error)
      }
    },

    async loadStatsInBackground() {
      try {
        // Aguardar os agendamentos serem carregados ou usar dados existentes
        await new Promise(resolve => {
          const checkSchedules = () => {
            if (this.schedules && this.schedules.length >= 0) {
              resolve()
            } else {
              setTimeout(checkSchedules, 100)
            }
          }
          checkSchedules()
        })
        
        console.log('Calculando estatísticas...')
        const schedules = this.schedules || []
        
        this.dashboardStats = {
          solicitacoes: schedules.filter(s => s.status === 'Solicitado').length,
          agendamentos: schedules.filter(s => s.status === 'Agendado').length,
          conferencia: schedules.filter(s => s.status === 'Conferência' || s.status === 'Recebido').length,
          tratativa: schedules.filter(s => s.status === 'Tratativa').length,
        }
        
        console.log('Estatísticas calculadas:', this.dashboardStats)
      } catch (error) {
        console.error('Erro ao calcular estatísticas:', error)
      }
    },

    // MÉTODO OTIMIZADO: Carrega apenas dados essenciais
    async loadEssentialDataOptimized() {
      this.statsLoading = true
      try {
        // Usar o apiClient global com cache
        console.log('🎯 Fazendo única requisição para /schedules...')
        
        // UMA ÚNICA REQUISIÇÃO para obter todos os dados necessários
        const response = await apiClient.request('/schedules', {
          method: 'GET',
          params: {
            page: this.pagination.page,
            limit: this.pagination.limit,
            ...this.currentFilters // Aplicar filtros
          }
        })
        
        if (response && response.schedules) {
          // Usar os dados para multiple propósitos
          this.schedules = response.schedules
          this.pagination = response.pagination || {}
          
          // Calcular estatísticas a partir dos dados já carregados
          this.calculateStatsFromData(response.schedules)
          
          console.log('💡 Dados reutilizados para stats e lista!')
        }
      } catch (error) {
        console.error('Erro ao carregar dados essenciais:', error)
        this.addNotification('Erro ao carregar dados iniciais', 'error')
      } finally {
        this.statsLoading = false
      }
    },

    // Calcular stats a partir dos dados já carregados (sem nova requisição)
    calculateStatsFromData(schedules) {
      const stats = {
        solicitacoes: 0,
        agendamentos: 0,
        conferencia: 0,
        tratativa: 0
      }

      schedules.forEach(schedule => {
        const status = schedule.status?.toLowerCase()
        switch (status) {
          case 'solicitado':
            stats.solicitacoes++
            break
          case 'agendado':
            stats.agendamentos++
            break
          case 'conferencia':
          case 'recebido': // Compatibilidade com dados antigos
          case 'estoque':
            stats.conferencia++
            break
          case 'tratativa':
            stats.tratativa++
            break
        }
      })

      this.dashboardStats = stats
      console.log('📈 Stats calculadas localmente:', stats)
    },

    // Carregar dados secundários apenas quando necessário
    async loadSecondaryDataLazy() {
      console.log('⏳ Carregando dados secundários...')
      
      // Carregar apenas se os componentes estiverem visíveis/sendo usados
      const promises = []
      
      // Se não temos todos os agendamentos, carregar mais
      if (this.schedules.length < (this.pagination.total || 0)) {
        promises.push(this.loadRemainingSchedules())
      }
      
      // Carregar outras atividades se necessário
      promises.push(this.loadRecentActivitiesIfNeeded())
      
      if (promises.length > 0) {
        await Promise.allSettled(promises)
        console.log('🎉 Dados secundários carregados!')
      }
    },

    async loadRemainingSchedules() {
      if (!this.pagination.total || this.schedules.length >= this.pagination.total) {
        return // Já temos todos os dados
      }
      
      try {
        // Usar o apiClient global com cache
        const response = await apiClient.request('/schedules', {
          method: 'GET',
          params: {
            page: 2, // Carregar páginas seguintes
            limit: this.pagination.total - this.schedules.length
          }
        })
        
        if (response && response.schedules) {
          this.schedules.push(...response.schedules)
        }
      } catch (error) {
        console.error('Erro ao carregar agendamentos restantes:', error)
      }
    },

    async loadRecentActivitiesIfNeeded() {
      // Carregar apenas se o usuário estiver visualizando essa seção
      // Implementação futura conforme necessidade
    },

    async loadStatsImmediately() {
      try {
        console.log('Carregando estatísticas imediatamente...')
        // Usar o apiClient global com cache
        const response = await apiClient.getSchedules()
        const schedules = response.schedules || []
        
        this.dashboardStats = {
          solicitacoes: schedules.filter(s => s.status === 'Solicitado').length,
          agendamentos: schedules.filter(s => s.status === 'Agendado').length,
          conferencia: schedules.filter(s => s.status === 'Conferência' || s.status === 'Recebido').length,
          tratativa: schedules.filter(s => s.status === 'Tratativa').length,
        }
        
        console.log('Estatísticas carregadas imediatamente:', this.dashboardStats)
      } catch (error) {
        console.error('Erro ao carregar estatísticas imediatamente:', error)
        // Fallback para estatísticas zeradas
        this.dashboardStats = {
          solicitacoes: 0,
          agendamentos: 0,
          conferencia: 0,
          tratativa: 0,
        }
      }
    },

    async loadRecentActivitiesInBackground() {
      try {
        console.log('Carregando atividades recentes...')
        // Usar o apiClient global com cache
        this.recentActivities = await apiClient.getRecentActivities()
        console.log('Atividades recentes carregadas:', this.recentActivities.length)
      } catch (error) {
        console.error('Erro ao carregar atividades:', error)
        this.recentActivities = []
      }
    },

    async loadPendingDeliveriesInBackground() {
      try {
        console.log('Carregando entregas pendentes...')
        // Usar o apiClient global com cache
        this.pendingDeliveries = await apiClient.getPendingDeliveries()
        console.log('Entregas pendentes carregadas:', this.pendingDeliveries.length)
      } catch (error) {
        console.error('Erro ao carregar entregas:', error)
        this.pendingDeliveries = []
      }
    },
    canSelectSchedule(schedule) {
      // Verificar se pode selecionar baseado no status e permissões do usuário
      const allowedStatuses = ['Solicitado', 'Contestado', 'Cancelar', 'Agendado', 'Conferência', 'Recebido', 'Tratativa', 'Estoque', 'Marcação']
      if (!allowedStatuses.includes(schedule.status)) return false
      
      // Verificar permissões específicas para agendamentos de marcação
      if (schedule.status === 'Marcação') {
        // Apenas usuários com nível diferente de 1 podem selecionar marcações
        const currentUser = this.getCurrentUser()
        if (currentUser && currentUser.level_access === 1) {
          return false
        }
      }
      
      // Se já tem agendamentos selecionados, só pode selecionar do mesmo status
      if ((this.selectedSchedules || []).length > 0) {
        const selectedStatuses = this.selectedScheduleStatuses
        if (selectedStatuses.length === 1 && !selectedStatuses.includes(schedule.status)) {
          return false
        }
      }
      return true
    },
    getStatusBadge(status) {
      const statusConfig = {
        Solicitado: { class: 'warning', label: 'Solicitado' },
        Contestado: { class: 'contestado', label: 'Contestado' },
        Agendado: { class: 'primary', label: 'Agendado' },
        Conferência: { class: 'success', label: 'Em conferência' },
        Recebido: { class: 'success', label: 'Em conferência' }, // Compatibilidade com dados antigos
        Tratativa: { class: 'danger', label: 'Em tratativa' },
        Estoque: { class: 'success', label: 'Em estoque' },
        Recusar: { class: 'danger', label: 'Recusar' },
        Cancelar: { class: 'warning', label: 'Cancelar' },
        Recusado: { class: 'dark', label: 'Recusado' },
        Cancelado: { class: 'secondary', label: 'Cancelado' },
        Marcação: { class: 'booking', label: 'Marcação' },
      }
      return statusConfig[status] || { class: 'secondary', label: 'Desconhecido' }
    },
    onScheduleSelect() {
      // Verificar se todos os agendamentos selecionáveis estão selecionados
      const selectableSchedules = (this.displayedSchedules || []).filter(schedule => 
        this.canSelectSchedule(schedule)
      )
      // Checkbox select all removido - apenas seleção individual
      // Verificar se os agendamentos selecionados têm o mesmo status
      const selectedStatuses = this.selectedScheduleStatuses
      if (selectedStatuses.length > 1) {
        // Se tiver status diferentes, manter apenas o último selecionado
        const lastSelected = this.selectedSchedules[this.selectedSchedules.length - 1]
        const lastSelectedSchedule = (this.schedules || []).find(s => s.id === lastSelected)
        if (lastSelectedSchedule) {
          this.selectedSchedules = this.selectedSchedules.filter(id => {
            const schedule = (this.schedules || []).find(s => s.id === id)
            return schedule && schedule.status === lastSelectedSchedule.status
          })
        }
      }
    },
    formatDate(date) {
      if (!date) return ''
      
      // Evitar problemas de timezone para datas no formato YYYY-MM-DD
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-')
        return `${day}/${month}/${year}`
      }
      
      // Fallback para outros formatos
      try {
        const d = new Date(date)
        if (isNaN(d)) return date
        return d.toLocaleDateString('pt-BR')
      } catch (error) {
        return date
      }
    },
    
    formatDateForDisplay(dateString) {
      if (!dateString) return ''
      
      // Se já está no formato YYYY-MM-DD, converter para DD/MM/YYYY
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
      }
      
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) {
          return dateString
        }
        return date.toLocaleDateString('pt-BR')
      } catch (error) {
        return dateString
      }
    },
    openInfoModal(schedule) {
      this.selectedSchedule = schedule
      this.showInfoModal = true
    },
    closeInfoModal() {
      this.showInfoModal = false
      this.selectedSchedule = null
    },
    openEditModal(schedule) {
      console.log('openEditModal chamado com:', schedule)
      this.scheduleToEdit = schedule || this.selectedSchedule
      this.showEditModal = true
      setTimeout(() => {
        console.log('showEditModal:', this.showEditModal, 'scheduleToEdit:', this.scheduleToEdit)
      }, 100)
    },
    closeEditModal() {
      this.showEditModal = false
      this.scheduleToEdit = null
      // Fechar também o modal de informações da NF-e se estiver aberto
      this.closeInfoModal()
    },
    
    openScheduleCreationModal() {
      this.showScheduleCreationModal = true
    },
    
    closeScheduleCreationModal() {
      this.showScheduleCreationModal = false
    },
    
    async handleScheduleCreated(createdSchedule) {
      console.log('Agendamento criado:', createdSchedule)
      this.addNotification('Agendamento criado com sucesso!', 'success')
      this.closeScheduleCreationModal()
      
      // Recarregar a lista de agendamentos
      await this.refreshPageAfterAction('Lista atualizada com novo agendamento')
    },

    // Métodos para agendamento de marcação
    openBookingModal() {
      this.showBookingModal = true
    },

    closeBookingModal() {
      this.showBookingModal = false
    },

    async handleBookingCreated(createdBooking) {
      console.log('Agendamento de marcação criado:', createdBooking)
      this.addNotification('Agendamento de marcação criado com sucesso!', 'success')
      this.closeBookingModal()
      
      // Recarregar a lista de agendamentos
      await this.refreshPageAfterAction('Lista atualizada com novo agendamento de marcação')
    },
    async handleScheduleUpdated(updatedSchedule) {
      console.log('✅ Agendamento atualizado:', updatedSchedule)
      
      // Limpar o cache para forçar atualização completa
      if (window.apiClient && window.apiClient.clearCache) {
        window.apiClient.clearCache('/schedules')
        console.log('🗑️ Cache de agendamentos limpo')
      }
      
      // Atualização completa da página
      this.loading = true
      this.statsLoading = true
      
      try {
        // Recarregar dados essenciais completamente
        await this.loadEssentialDataOptimized()
        
        // Adicionar notificação de sucesso
        this.addNotification('Agendamento atualizado com sucesso', 'success')
        
        console.log('🔄 Página atualizada completamente após edição')
      } catch (error) {
        console.error('Erro ao atualizar página:', error)
        this.addNotification('Erro ao atualizar dados', 'error')
      } finally {
        this.loading = false
        this.statsLoading = false
      }
      
      // Fechar modal de edição (que automaticamente fecha o de informações)
      this.closeEditModal()
    },

    // Método auxiliar para atualização completa após ações
    async refreshPageAfterAction(successMessage) {
      // Limpar o cache para forçar atualização completa
      if (window.apiClient && window.apiClient.clearCache) {
        window.apiClient.clearCache('/schedules')
        console.log('🗑️ Cache de agendamentos limpo após ação')
      }
      
      // Atualização completa
      this.loading = true
      this.statsLoading = true
      
      try {
        await this.loadEssentialDataOptimized()
        if (successMessage) {
          this.addNotification(successMessage, 'success')
        }
        console.log('🔄 Página atualizada completamente após ação')
      } catch (error) {
        console.error('Erro ao atualizar página:', error)
        this.addNotification('Erro ao atualizar dados', 'error')
      } finally {
        this.loading = false
        this.statsLoading = false
      }
    },

    canSelectSchedule(schedule) {
      const allowedStatuses = ['Solicitado', 'Contestado', 'Cancelar', 'Agendado', 'Conferência', 'Recebido', 'Tratativa', 'Estoque', 'Marcação']
      if (!allowedStatuses.includes(schedule.status)) return false
      
      // Verificar permissões específicas para agendamentos de marcação
      if (schedule.status === 'Marcação') {
        // Apenas usuários com nível diferente de 1 podem selecionar marcações
        const currentUser = this.getCurrentUser()
        if (currentUser && currentUser.level_access === 1) {
          return false
        }
      }
      
      if ((this.selectedSchedules || []).length > 0) {
        const selectedStatuses = this.selectedScheduleStatuses
        if (selectedStatuses.length === 1 && !selectedStatuses.includes(schedule.status)) {
          return false
        }
      }
      return true
    },
    clearSelection() {
      this.selectedSchedules = []
      this.newDate = ''
    },
    async loadMoreSchedules() {
      if (this.loadingMore || !this.pagination.hasMore) return
      
      this.loadingMore = true
      this.pagination.page += 1
      
      try {
        await this.loadSchedules()
      } catch (error) {
        // Se der erro, volta a página anterior
        this.pagination.page -= 1
      } finally {
        this.loadingMore = false
      }
    },

    handleScroll(event) {
      const { scrollTop, scrollHeight, clientHeight } = event.target
      const threshold = 100 // pixels do fim para começar a carregar
      
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        this.loadMoreSchedules()
      }
    },
    async acceptSchedules() {
      if (this.selectedSchedules.length === 0) return
      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Agendado', 'Agendamento aceito')
        this.clearSelection()
        await this.refreshPageAfterAction(`${this.selectedSchedules.length} agendamento(s) aceito(s) com sucesso`)
      } catch (error) {
        console.error('Erro ao aceitar agendamentos:', error)
        this.addNotification('Erro ao aceitar agendamentos', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },
    async changeDateToContestado() {
      if (this.selectedSchedules.length === 0 || !this.newDate) return
      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatusWithDateAndComment('Contestado', this.newDate)
        this.clearSelection()
        await this.refreshPageAfterAction(`Data alterada para ${this.selectedSchedules.length} agendamento(s)`)
      } catch (error) {
        console.error('Erro ao alterar data:', error)
        this.addNotification('Erro ao alterar data dos agendamentos', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },
    async acceptNewDate() {
      if (this.selectedSchedules.length === 0) return
      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Agendado', 'Nova data aceita')
        this.clearSelection()
        await this.refreshPageAfterAction(`Nova data aceita para ${this.selectedSchedules.length} agendamento(s)`)
      } catch (error) {
        console.error('Erro ao aceitar nova data:', error)
        this.addNotification('Erro ao aceitar nova data', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },
    async confirmContestado() {
      if (this.selectedSchedules.length === 0) return
      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Agendado', 'Data contestada confirmada')
        this.clearSelection()
        await this.refreshPageAfterAction(`${this.selectedSchedules.length} agendamento(s) confirmado(s)`)
      } catch (error) {
        console.error('Erro ao confirmar agendamentos:', error)
        this.addNotification('Erro ao confirmar agendamentos', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },
    async changeContestadoToAgendado() {
      if (this.selectedSchedules.length === 0 || !this.newDate) return
      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatusWithDate('Agendado', this.newDate, 'Data contestada reagendada')
        this.clearSelection()
        await this.refreshPageAfterAction(`${this.selectedSchedules.length} agendamento(s) reagendado(s)`)
      } catch (error) {
        console.error('Erro ao reagendar:', error)
        this.addNotification('Erro ao reagendar agendamentos', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },
    
    async cancelSchedules() {
      if (this.selectedSchedules.length === 0) return
      
      if (!confirm(`Tem certeza que deseja cancelar ${this.selectedSchedules.length} agendamento(s)?`)) {
        return
      }
      
      this.bulkActionLoading = true
      try {
        // Usuário nível 1 (admin) -> status "Cancelar" (precisa aprovação)
        // Outros usuários -> status "Cancelado" (cancelamento direto)
        const newStatus = this.userLevel === 1 ? 'Cancelar' : 'Cancelado'
        const comment = this.userLevel === 1 ? 'Agendamento solicitado para cancelamento' : 'Agendamento cancelado diretamente'
        
        await this.bulkUpdateStatus(newStatus, comment)
        
        const message = this.userLevel === 1 
          ? `${this.selectedSchedules.length} agendamento(s) marcado(s) para cancelamento` 
          : `${this.selectedSchedules.length} agendamento(s) cancelado(s) com sucesso`
          
        this.clearSelection()
        await this.refreshPageAfterAction(message)
      } catch (error) {
        console.error('Erro ao cancelar agendamentos:', error)
        this.addNotification('Erro ao cancelar agendamentos', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },

    async deleteMarcacoes() {
      if (this.selectedSchedules.length === 0) return
      
      if (!confirm(`Tem certeza que deseja excluir ${this.selectedSchedules.length} marcação(ões)? Esta ação não pode ser desfeita.`)) {
        return
      }
      
      this.bulkActionLoading = true
      try {
        // Deletar cada marcação selecionada
        for (const scheduleId of this.selectedSchedules) {
          await window.apiClient.request(`/schedules/${scheduleId}`, {
            method: 'DELETE'
          })
        }
        
        this.addNotification(`${this.selectedSchedules.length} marcação(ões) excluída(s) com sucesso`, 'success')
        this.clearSelection()
        await this.refreshPageAfterAction()
      } catch (error) {
        console.error('Erro ao excluir marcações:', error)
        this.addNotification('Erro ao excluir marcações', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },
    
    async markAsReceived() {
      if (this.selectedSchedules.length === 0) return
      
      if (!confirm(`Tem certeza que deseja marcar ${this.selectedSchedules.length} agendamento(s) como em conferência?`)) {
        return
      }
      
      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Conferência', 'Agendamento marcado como em conferência')
        this.clearSelection()
        await this.refreshPageAfterAction(`${this.selectedSchedules.length} agendamento(s) marcado(s) como em conferência`)
      } catch (error) {
        console.error('Erro ao marcar como em conferência:', error)
        this.addNotification('Erro ao marcar agendamentos como em conferência', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },

    async markAsEstoque() {
      if (this.selectedSchedules.length === 0) return
      
      if (!confirm(`Tem certeza que deseja marcar ${this.selectedSchedules.length} agendamento(s) como em estoque?`)) {
        return
      }
      
      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Estoque', 'Agendamento marcado como em estoque')
        this.clearSelection()
        await this.refreshPageAfterAction(`${this.selectedSchedules.length} agendamento(s) marcado(s) como em estoque`)
      } catch (error) {
        console.error('Erro ao marcar como em estoque:', error)
        this.addNotification('Erro ao marcar agendamentos como em estoque', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },

    async markAsTratativa() {
      if (this.selectedSchedules.length === 0) return
      
      if (!confirm(`Tem certeza que deseja marcar ${this.selectedSchedules.length} agendamento(s) como em tratativa?`)) {
        return
      }
      
      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Tratativa', 'Agendamento marcado como em tratativa devido a problemas identificados')
        this.clearSelection()
        await this.refreshPageAfterAction(`${this.selectedSchedules.length} agendamento(s) marcado(s) como em tratativa`)
      } catch (error) {
        console.error('Erro ao marcar como tratativa:', error)
        this.addNotification('Erro ao marcar agendamentos como em tratativa', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },

    async handleMarkSingleAsTratativa(scheduleData) {
      console.log('🔄 Marcando agendamento individual como tratativa:', scheduleData)
      
      if (!scheduleData || !scheduleData.id) {
        this.addNotification('Erro: dados do agendamento não encontrados', 'error')
        return
      }
      
      if (!confirm(`Tem certeza que deseja marcar o agendamento "${scheduleData.number || scheduleData.id}" como em tratativa?`)) {
        return
      }
      
      this.loading = true
      try {
        // Usar o apiClient para atualizar status individual
        const apiClient = window.apiClient
        
        await apiClient.updateScheduleStatus(
          scheduleData.id,
          'Tratativa',
          'Agendamento marcado como em tratativa devido a problemas identificados'
        )
        
        this.addNotification('Agendamento marcado como em tratativa com sucesso!', 'success')
        
        // Fechar modal de informações
        this.closeInfoModal()
        
        // Recarregar lista
        await this.refreshPageAfterAction('Status atualizado para tratativa')
        
      } catch (error) {
        console.error('Erro ao marcar agendamento como tratativa:', error)
        this.addNotification('Erro ao marcar agendamento como em tratativa', 'error')
      } finally {
        this.loading = false
      }
    },

    async handleChangeStatusFromTratativa({ scheduleData, newStatus }) {
      console.log('🔄 Alterando status de tratativa para:', newStatus, 'agendamento:', scheduleData)
      
      if (!scheduleData || !scheduleData.id) {
        this.addNotification('Erro: dados do agendamento não encontrados', 'error')
        return
      }
      
      if (!newStatus) {
        this.addNotification('Erro: novo status não informado', 'error')
        return
      }
      
      const statusLabels = {
        'Solicitado': 'Solicitado',
        'Contestado': 'Contestado', 
        'Agendado': 'Agendado',
        'Conferência': 'Em conferência',
        'Recebido': 'Em conferência',
        'Estoque': 'Em estoque',
        'Tratativa': 'Em tratativa',
        'Cancelar': 'Cancelar',
        'Cancelado': 'Cancelado',
        'Recusado': 'Recusado'
      }
      
      const statusLabel = statusLabels[newStatus] || newStatus
      
      if (!confirm(`Tem certeza que deseja alterar o agendamento "${scheduleData.number || scheduleData.id}" de "Em tratativa" para "${statusLabel}"?`)) {
        return
      }
      
      this.loading = true
      try {
        // Usar o apiClient para atualizar status individual
        const apiClient = window.apiClient
        
        await apiClient.updateScheduleStatus(
          scheduleData.id,
          newStatus,
          `Status alterado de "Em tratativa" para "${statusLabel}" pelo usuário`
        )
        
        this.addNotification(`Status alterado para "${statusLabel}" com sucesso!`, 'success')
        
        // Fechar modal de informações
        this.closeInfoModal()
        
        // Recarregar lista
        await this.refreshPageAfterAction(`Status atualizado para ${statusLabel}`)
        
      } catch (error) {
        console.error('Erro ao alterar status do agendamento:', error)
        this.addNotification(`Erro ao alterar status para "${statusLabel}"`, 'error')
      } finally {
        this.loading = false
      }
    },

    async acceptCancellation() {
      if (this.selectedSchedules.length === 0) return
      
      if (!confirm(`Tem certeza que deseja aceitar o cancelamento de ${this.selectedSchedules.length} agendamento(s)?`)) {
        return
      }
      
      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Cancelado', 'Cancelamento aceito')
        this.clearSelection()
        await this.refreshPageAfterAction(`${this.selectedSchedules.length} cancelamento(s) aceito(s)`)
      } catch (error) {
        console.error('Erro ao aceitar cancelamento:', error)
        this.addNotification('Erro ao aceitar cancelamento', 'error')
      } finally {
        this.bulkActionLoading = false
      }
    },
    async bulkUpdateStatus(newStatus, comment) {
      // Usar o apiClient global com cache
      for (const scheduleId of this.selectedSchedules) {
        const payload = {
          status: newStatus,
          historic_entry: {
            user: this.getCurrentUser(),
            action: `Status alterado para ${newStatus}`,
            comment: comment
          }
        }
        await apiClient.request(`/schedules/${scheduleId}/status`, {
          method: 'PATCH',
          data: payload
        })
      }
    },
    async bulkUpdateStatusWithDate(newStatus, newDate, comment) {
      // Usar o apiClient global com cache
      const formattedDate = this.formatDateForBackend(newDate)
      for (const scheduleId of this.selectedSchedules) {
        const scheduleResponse = await apiClient.request(`/schedules/${scheduleId}`, {
          method: 'GET'
        })
        const currentSchedule = scheduleResponse.schedule
        const updatePayload = {
          number: currentSchedule.number,
          nfe_key: currentSchedule.nfe_key,
          client: currentSchedule.client_cnpj || currentSchedule.client,
          case_count: currentSchedule.case_count,
          date: formattedDate,
          qt_prod: currentSchedule.qt_prod,
          historic: {
            ...currentSchedule.historic,
            [`date_change_${Date.now()}`]: {
              timestamp: new Date().toISOString(),
              user: this.getCurrentUser(),
              action: `Data alterada de ${this.formatDateForDisplay(currentSchedule.date)} para ${this.formatDateForDisplay(formattedDate)}`,
              comment: 'Data alterada via bulk action',
              previous_date: currentSchedule.date,
              new_date: formattedDate
            }
          }
        }
        await apiClient.request(`/schedules/${scheduleId}`, {
          method: 'PUT',
          data: updatePayload
        })
        const statusPayload = {
          status: newStatus,
          historic_entry: {
            user: this.getCurrentUser(),
            action: `Status alterado para ${newStatus} com nova data ${this.formatDateForDisplay(formattedDate)}`,
            comment: comment
          }
        }
        await apiClient.request(`/schedules/${scheduleId}/status`, {
          method: 'PATCH',
          data: statusPayload
        })
      }
    },

    async bulkUpdateStatusWithDateAndComment(newStatus, newDate) {
      // Usar o apiClient global com cache
      const formattedDate = this.formatDateForBackend(newDate)
      for (const scheduleId of this.selectedSchedules) {
        const scheduleResponse = await apiClient.request(`/schedules/${scheduleId}`, {
          method: 'GET'
        })
        const currentSchedule = scheduleResponse.schedule
        
        // Gerar comentário personalizado para contestação
        const oldDateFormatted = this.formatDateForDisplay(currentSchedule.date)
        const newDateFormatted = this.formatDateForDisplay(formattedDate)
        const customComment = `A data escolhida (${oldDateFormatted}) está indisponível, a data escolhida pela nossa equipe é ${newDateFormatted}. Por gentileza confirmar em nossa plataforma.`
        
        const updatePayload = {
          number: currentSchedule.number,
          nfe_key: currentSchedule.nfe_key,
          client: currentSchedule.client_cnpj || currentSchedule.client,
          case_count: currentSchedule.case_count,
          date: formattedDate,
          qt_prod: currentSchedule.qt_prod,
          historic: {
            ...currentSchedule.historic,
            [`date_change_${Date.now()}`]: {
              timestamp: new Date().toISOString(),
              user: this.getCurrentUser(),
              action: `Data alterada de ${oldDateFormatted} para ${newDateFormatted}`,
              comment: customComment,
              previous_date: currentSchedule.date,
              new_date: formattedDate
            }
          }
        }
        await apiClient.request(`/schedules/${scheduleId}`, {
          method: 'PUT',
          data: updatePayload
        })
        const statusPayload = {
          status: newStatus,
          historic_entry: {
            user: this.getCurrentUser(),
            action: `Status alterado para ${newStatus} com nova data ${newDateFormatted}`,
            comment: customComment
          }
        }
        await apiClient.request(`/schedules/${scheduleId}/status`, {
          method: 'PATCH',
          data: statusPayload
        })
      }
    },
    getCurrentUser() {
      try {
        const userData = localStorage.getItem('user')
        if (!userData) return 'Usuário desconhecido'
        const user = JSON.parse(userData)
        return user.user || 'Usuário desconhecido'
      } catch (error) {
        return 'Usuário desconhecido'
      }
    },
    formatDateForBackend(dateString) {
      if (!dateString) return null
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString
      }
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },

    // Métodos de filtros
    handleFiltersChanged(newFilters) {
      this.currentFilters = { ...newFilters }
      this.pagination.page = 1
      this.pagination.hasMore = true
      this.schedules = [] // Limpar lista atual
      this.loadSchedules()
    },

    handleResetFilters() {
      console.log('🔄 Resetando filtros')
      this.currentFilters = {
        status: '',
        client: '',
        date_from: '',
        date_to: '',
        nfe_number: '',
      }
      this.pagination.page = 1
      this.pagination.hasMore = true
      this.schedules = [] // Limpar lista atual
      this.loadSchedules()
    },

    // Carregar clientes disponíveis baseado no cli_access do usuário
    loadAvailableClients() {
      try {
        const userData = localStorage.getItem('user')
        
        if (!userData) {
          return
        }
        
        const user = JSON.parse(userData)
        
        // Tratar cli_access se estiver como string
        let cliAccess = user.cli_access
        if (typeof cliAccess === 'string' && cliAccess) {
          try {
            cliAccess = JSON.parse(cliAccess)
          } catch (e) {
            cliAccess = null
          }
        }
        
        // Se o usuário tem level_access = 0, tem acesso total
        if (user.level_access === 0) {
          // Para desenvolvedores, podemos buscar todos os clientes via API
          // Por enquanto, vamos deixar vazio e carregar dinamicamente dos agendamentos
          this.availableClients = []
          return
        }
        
        // Para outros usuários, usar cli_access
        if (cliAccess && typeof cliAccess === 'object') {
          const cliAccessEntries = Object.entries(cliAccess)
          
          const clients = cliAccessEntries.map(([cnpj, data]) => {
            return {
              cnpj: cnpj,
              name: data.nome || `Cliente ${cnpj}`,
              number: data.numero || cnpj
            }
          })
          
          this.availableClients = clients
        } else {
          this.availableClients = []
        }
      } catch (error) {
        console.error('❌ Erro ao carregar clientes disponíveis:', error)
        this.availableClients = []
      }
    },


    handleReprocessSuccess(scheduleData) {
      console.log('✅ Reprocessamento bem-sucedido para agendamento:', scheduleData.id);
      // Recarregar dados do dashboard se necessário
      this.loadEssentialDataOptimized();
    },

    handleReprocessToast(message) {
      this.addNotification(message, 'info');
    },

    async loadInitialData() {
      try {
        console.log('📊 Carregando dados iniciais...')
        
        // Carregar clientes disponíveis
        this.loadAvailableClients()
        
        // Carregar dados essenciais
        await this.loadEssentialDataOptimized()
        
        // Liberar interface
        this.loading = false
        console.log('✅ Dados iniciais carregados!')
        
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error)
        this.addNotification('Erro ao carregar dados iniciais', 'error')
        this.loading = false
      }
    },
  },
}

// Disponibilizar globalmente para compatibilidade
window.apiClient = apiClient
</script>

<style scoped>
/* Table wrapper for infinite scroll */
.table-wrapper {
  max-height: 600px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
}

.schedules-table {
  width: 100%;
  margin-bottom: 0;
}

/* Loading more indicator */
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  color: #6c757d;
  border-top: 1px solid #dee2e6;
  background-color: #f8f9fa;
}

.loading-more i {
  margin-right: 0.5rem;
}

.loading-more p {
  margin: 0;
  font-size: 0.875rem;
}

/* Selection badge styles */
.selection-btn {
  position: relative;
}

.selection-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  font-size: 0.75rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.selected-info {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  gap: 1rem;
  font-weight: 500;
  color: #495057;
  flex-wrap: wrap;
}

/* Status badge styles */
.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  border: 1px solid;
  display: inline-block;
}

.status-badge.warning {
  background-color: #fff3cd;
  color: #856404;
  border-color: #ffeaa7;
}

.status-badge.primary {
  background-color: #cce5ff;
  color: #004085;
  border-color: #007bff;
}

.status-badge.success {
  background-color: #d4edda;
  color: #155724;
  border-color: #28a745;
}

.status-badge.danger {
  background-color: #f8d7da;
  color: #721c24;
  border-color: #dc3545;
}

.status-badge.dark {
  background-color: #d6d6d6;
  color: #1b1e21;
  border-color: #343a40;
}

.status-badge.secondary {
  background-color: #e2e3e5;
  color: #383d41;
  border-color: #6c757d;
}

/* Status badge personalizado para Contestado */
.status-badge.contestado {
  background-color: #8B1538 !important; /* Cor vinho */
  color: white !important;
  border-color: #8B1538 !important;
}

/* Status badge personalizado para Marcação */
.status-badge.booking {
  background-color: #f3e5f5 !important; /* Roxo claro */
  color: #7b1fa2 !important; /* Roxo escuro */
  border-color: #ba68c8 !important; /* Roxo médio */
  font-weight: 500 !important;
}

/* Bulk Actions Styles */
.bulk-actions-bar {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  min-height: 50px;
}

.contestado-actions,
.solicitado-actions,
.agendado-actions,
.cancelar-actions,
.universal-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  white-space: nowrap;
}

.non-level-1-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  white-space: nowrap;
}

.level-1-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.action-btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.non-level-1-actions input[type="date"],
.solicitado-actions input[type="date"] {
  width: 150px;
  padding: 0.5rem;
}

@media (max-width: 768px) {
  .bulk-actions-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .bulk-actions {
    justify-content: center;
  }
  
  .contestado-actions,
  .solicitado-actions,
  .agendado-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .non-level-1-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* Header actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-actions .btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-actions .btn-primary {
  margin-right: 0.75rem;
  font-weight: 600;
}

/* Checkboxes maiores */
.schedules-table input[type="checkbox"] {
  transform: scale(1.5);
  margin: 0;
  cursor: pointer;
}

/* Botão Aceitar Cancelamento com cor vinho */
.btn-accept-cancel {
  background-color: #8B1538 !important;
  border-color: #8B1538 !important;
  color: white !important;
}

.btn-accept-cancel:hover {
  background-color: #6B1028 !important;
  border-color: #6B1028 !important;
  color: white !important;
}

.btn-accept-cancel:focus,
.btn-accept-cancel:active {
  background-color: #5B0E20 !important;
  border-color: #5B0E20 !important;
  color: white !important;
  box-shadow: 0 0 0 0.2rem rgba(139, 21, 56, 0.25) !important;
}

/* Action buttons styling */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
