<template>
  <div class="schedules-list">
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
          <!-- For level_access = 1 users -->
          <div v-if="userLevel === 1" class="level-1-actions">
            <button 
              class="btn btn-success action-btn" 
              @click="acceptNewDate"
              :disabled="bulkActionLoading"
            >
              <i class="fas fa-check"></i> Aceitar Nova Data
            </button>
            <span class="contact-text">Ou entre em contato com nossa equipe</span>
          </div>
          
          <!-- For non-level 1 users -->
          <div v-else class="non-level-1-actions">
            <button 
              class="btn btn-success action-btn" 
              @click="confirmContestado"
              :disabled="bulkActionLoading"
            >
              <i class="fas fa-check"></i> Confirmar
            </button>
            
            <input 
              type="date" 
              v-model="newDate" 
              class="form-control"
              :min="today"
            />
            <button 
              class="btn btn-success action-btn" 
              @click="changeContestadoToAgendado"
              :disabled="!newDate || bulkActionLoading"
            >
              <i class="fas fa-calendar-alt"></i> Agendar
            </button>
          </div>
        </div>
        
        <!-- Actions for Solicitado status -->
        <div v-if="selectedScheduleStatuses[0] === 'Solicitado' && userLevel !== 1" class="solicitado-actions">
          <button 
            class="btn btn-success action-btn" 
            @click="acceptSchedules"
            :disabled="bulkActionLoading"
          >
            <i class="fas fa-check"></i> Aceitar Agendamento
          </button>
          
          <input 
            type="date" 
            v-model="newDate" 
            class="form-control"
            :min="today"
          />
          <button 
            class="btn btn-warning action-btn" 
            @click="changeDateToContestado"
            :disabled="!newDate || bulkActionLoading"
          >
            <i class="fas fa-calendar-alt"></i> Alterar Data
          </button>
        </div>
        
        <!-- Actions for Agendado status (non-level 1 users can mark as received) -->
        <div v-if="selectedScheduleStatuses[0] === 'Agendado' && userLevel !== 1" class="agendado-actions">
          <button 
            class="btn btn-success action-btn" 
            @click="markAsReceived"
            :disabled="bulkActionLoading"
          >
            <i class="fas fa-check-circle"></i> Marcar como Conferência
          </button>
        </div>
        
        <!-- Actions for Conferência status (non-level 1 users can mark as Estoque) -->
        <div v-if="(selectedScheduleStatuses[0] === 'Conferência' || selectedScheduleStatuses[0] === 'Recebido') && userLevel !== 1" class="conferencia-actions">
          <button 
            class="btn btn-info action-btn" 
            @click="markAsEstoque"
            :disabled="bulkActionLoading"
          >
            <i class="fas fa-warehouse"></i> Marcar como Estoque
          </button>
        </div>
        
        <!-- Actions for Cancelar status (non-level 1 users can accept cancellation requests from level 1) -->
        <div v-if="selectedScheduleStatuses[0] === 'Cancelar' && userLevel !== 1" class="cancelar-actions">
          <button 
            class="btn btn-danger action-btn btn-accept-cancel" 
            @click="acceptCancellation"
            :disabled="bulkActionLoading"
          >
            <i class="fas fa-times-circle"></i> Aceitar Cancelamento
          </button>
          <span class="text-muted" style="font-size: 0.85em;">Solicitado por {{ cancelRequestedBy }}</span>
        </div>
        
        <!-- Universal Cancel Button (all users can cancel) -->
        <div v-if="selectedSchedules.length > 0 && !['Cancelar', 'Cancelado', 'Recusado', 'Estoque'].includes(selectedScheduleStatuses[0])" class="universal-actions">
          <button 
            class="btn btn-outline-danger action-btn" 
            @click="cancelSchedules"
            :disabled="bulkActionLoading"
          >
            <i class="fas fa-ban"></i> 
            {{ userLevel === 1 ? 'Solicitar Cancelamento' : 'Cancelar Agendamento' }}
          </button>
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
          <tr v-for="schedule in schedules" :key="schedule.id">
            <td>
              <input
                type="checkbox"
                :value="schedule.id"
                v-model="selectedSchedules"
                @change="onScheduleSelect"
                :disabled="!canSelectSchedule(schedule)"
              />
            </td>
            <td>{{ schedule.number }}</td>
            <td>{{ schedule.client }}</td>
            <td>{{ formatDate(schedule.date) }}</td>
            <td>{{ schedule.case_count }}</td>
            <td>
              <span
                :class="'status-badge ' + getStatusBadge(schedule.status).class"
                class="status-badge"
              >
                {{ getStatusBadge(schedule.status).label }}
              </span>
            </td>
            <td>
              <button
                class="btn btn-sm btn-outline-primary"
                @click="openInfoModal(schedule)"
                title="Mais informações"
              >
                <i class="fas fa-info-circle"></i>
                Detalhes
              </button>
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
    <nfe-info-modal
      v-if="showInfoModal"
      :nfe-data="selectedSchedule"
      :show-modal="showInfoModal"
      @close="closeInfoModal"
      @edit="openEditModal"
    >
    </nfe-info-modal>


    <schedule-edit-modal
      v-if="showEditModal"
      :schedule-data="scheduleToEdit"
      :show-modal="showEditModal"
      @close="closeEditModal"
      @updated="handleScheduleUpdated"
      @notification="$emit('notification', $event)"
    >
    </schedule-edit-modal>
  </div>
</template>

<script>
import NfeInfoModal from './NfeInfoModal.vue'
import ScheduleEditModal from './ScheduleEditModal.vue'
import ScheduleFilters from './ScheduleFilters.vue'

export default {
  name: 'SchedulesList',

  components: {
    NfeInfoModal,
    ScheduleEditModal,
    ScheduleFilters,
  },

  data() {
    return {
      schedules: [],
      loading: false,
      selectedSchedule: null,
      selectedSchedules: [],
      newDate: '',
      bulkActionLoading: false,
      showInfoModal: false,
      showEditModal: false,
      scheduleToEdit: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: true,
      },
      loadingMore: false,
      
      // Filtros
      currentFilters: {
        status: '',
        client: '',
        date_from: '',
        date_to: '',
        nfe_number: '',
      },
      availableClients: [],
    }
  },

  computed: {


    statusConfig() {
      return {
        Solicitado: { class: 'warning', label: 'Solicitado' },
        Contestado: { class: 'contestado', label: 'Contestado' },
        Agendado: { class: 'primary', label: 'Agendado' },
        Conferência: { class: 'success', label: 'Conferência' },
        Recebido: { class: 'success', label: 'Conferência' }, // Compatibilidade com dados antigos
        Tratativa: { class: 'danger', label: 'Tratativa' },
        Estoque: { class: 'success', label: 'Estoque' },
        Recusar: { class: 'danger', label: 'Recusar' },
        Cancelar: { class: 'warning', label: 'Cancelar' },
        Recusado: { class: 'dark', label: 'Recusado' },
        Cancelado: { class: 'secondary', label: 'Cancelado' },
      }
    },

    selectedScheduleStatuses() {
      const selected = this.schedules.filter(s => this.selectedSchedules.includes(s.id))
      return [...new Set(selected.map(s => s.status))]
    },
    cancelRequestedBy() {
      if (this.selectedSchedules.length === 0) return 'administrador'
      
      const selected = this.schedules.filter(s => this.selectedSchedules.includes(s.id))
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
      return this.selectedSchedules.length > 0 && this.selectedScheduleStatuses.length === 1
    },

    userLevel() {
      try {
        const userData = localStorage.getItem('user')
        if (!userData) return null
        const user = JSON.parse(userData)
        return user.level_access
      } catch (error) {
        console.error('Erro ao obter nível do usuário:', error)
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
        { value: 'Conferência', label: 'Conferência' },
        { value: 'Tratativa', label: 'Tratativa' },
        { value: 'Estoque', label: 'Estoque' },
        { value: 'Cancelar', label: 'Cancelar' },
        { value: 'Cancelado', label: 'Cancelado' },
        { value: 'Recusado', label: 'Recusado' },
      ]
    },
  },

  methods: {
    async loadSchedules() {
      if (this.pagination.page === 1) {
        this.loading = true
        this.clearSelection() // Clear selection when reloading
      }
      try {
        // Usar o apiClient global com cache
        const apiClient = window.apiClient
        console.log('Fazendo requisição para /schedules')
        console.log('Token presente:', !!localStorage.getItem('token'))

        const response = await apiClient.request('/schedules', {
          method: 'GET',
          params: {
            page: this.pagination.page,
            limit: this.pagination.limit,
            ...this.currentFilters // Aplicar filtros
          },
        })

        console.log('Resposta recebida:', response)
        const newSchedules = response.schedules || []
        
        if (this.pagination.page === 1) {
          this.schedules = newSchedules
        } else {
          this.schedules = [...this.schedules, ...newSchedules]
        }
        
        this.pagination.total = response.pagination?.total || 0
        this.pagination.hasMore = newSchedules.length === this.pagination.limit
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error)
        console.error('URL da requisição:', error.config?.url)
        console.error('Status do erro:', error.response?.status)
        console.error('Dados do erro:', error.response?.data)
        console.error('Headers da requisição:', error.config?.headers)

        // Verificar se é erro de autenticação
        if (error.response?.status === 401 || error.response?.status === 403) {
          this.$emit('notification', {
            type: 'error',
            message: 'Erro de autenticação. Por favor, faça login novamente.',
          })
          // Redirecionar para login se necessário
          localStorage.removeItem('token')
          window.location.href = '/index.html'
          return
        }

        // Verificar se é erro de servidor
        if (error.response?.status === 500) {
          this.$emit('notification', {
            type: 'error',
            message:
              'Erro interno do servidor. Verifique se o backend está funcionando corretamente.',
          })
        } else {
          this.$emit('notification', {
            type: 'error',
            message: `Erro ao carregar agendamentos: ${error.response?.status || 'Erro desconhecido'}`,
          })
        }

        this.schedules = []
      } finally {
        if (this.pagination.page === 1) {
          this.loading = false
        }
      }
    },

    openInfoModal(schedule) {
      console.log('📋 Abrindo modal NFe:', schedule)
      this.selectedSchedule = schedule
      this.showInfoModal = true
      console.log('📋 Modal state:', {
        showInfoModal: this.showInfoModal,
        selectedSchedule: this.selectedSchedule,
      })
    },

    closeInfoModal() {
      this.showInfoModal = false
      this.selectedSchedule = null
    },


    openEditModal(schedule) {
      console.log('🔧 Abrindo modal de edição:', schedule)
      this.scheduleToEdit = schedule
      this.showEditModal = true
      // Fechar o modal de informações NFe se estiver aberto
      this.showInfoModal = false
    },

    closeEditModal() {
      this.showEditModal = false
      this.scheduleToEdit = null
    },

    handleScheduleUpdated(updatedSchedule) {
      console.log('✅ Agendamento atualizado:', updatedSchedule)
      // Recarregar a lista para mostrar as alterações
      this.loadSchedules()
      this.closeEditModal()
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

    getStatusBadge(status) {
      return (
        this.statusConfig[status] || {
          class: 'secondary',
          label: 'Desconhecido',
        }
      )
    },

    formatDate(dateString) {
      if (!dateString) return '-'
      
      // Evitar problemas de timezone para datas no formato YYYY-MM-DD
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
      }
      
      // Fallback para outros formatos
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR')
      } catch (error) {
        return dateString
      }
    },

    formatCurrency(value) {
      if (!value) return 'R$ 0,00'
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value)
    },
    
    formatDateForDisplay(dateString) {
      if (!dateString) return ''
      
      // Para datas no formato YYYY-MM-DD, evitar conversão de timezone
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
      }
      
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR')
      } catch (error) {
        return dateString
      }
    },


    onScheduleSelect() {
      // Verificar se todos os agendamentos selecionáveis estão selecionados
      const selectableSchedules = this.schedules.filter(schedule => 
        this.canSelectSchedule(schedule)
      )
      // Checkbox select all removido - apenas seleção individual
      
      // Verificar se os agendamentos selecionados têm o mesmo status
      const selectedStatuses = this.selectedScheduleStatuses
      if (selectedStatuses.length > 1) {
        // Se tiver status diferentes, manter apenas o último selecionado
        const lastSelected = this.selectedSchedules[this.selectedSchedules.length - 1]
        const lastSelectedSchedule = this.schedules.find(s => s.id === lastSelected)
        if (lastSelectedSchedule) {
          this.selectedSchedules = this.selectedSchedules.filter(id => {
            const schedule = this.schedules.find(s => s.id === id)
            return schedule && schedule.status === lastSelectedSchedule.status
          })
        }
      }
    },

    canSelectSchedule(schedule) {
      // Verificar se pode selecionar baseado no status e permissões do usuário
      const allowedStatuses = ['Solicitado', 'Contestado', 'Cancelar', 'Agendado', 'Conferência', 'Recebido', 'Tratativa', 'Estoque']
      if (!allowedStatuses.includes(schedule.status)) return false

      // Se já tem agendamentos selecionados, só pode selecionar do mesmo status
      if (this.selectedSchedules.length > 0) {
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

    async acceptSchedules() {
      if (this.selectedSchedules.length === 0) return

      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Agendado', 'Agendamento aceito')
        this.$emit('notification', {
          type: 'success',
          message: `${this.selectedSchedules.length} agendamento(s) aceito(s) com sucesso`
        })
        this.clearSelection()
        await this.loadSchedules()
      } catch (error) {
        console.error('Erro ao aceitar agendamentos:', error)
        this.$emit('notification', {
          type: 'error',
          message: 'Erro ao aceitar agendamentos'
        })
      } finally {
        this.bulkActionLoading = false
      }
    },

    async changeDateToContestado() {
      if (this.selectedSchedules.length === 0 || !this.newDate) return

      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatusWithDateAndComment('Contestado', this.newDate)
        this.$emit('notification', {
          type: 'success',
          message: `Data alterada para ${this.selectedSchedules.length} agendamento(s)`
        })
        this.clearSelection()
        await this.loadSchedules()
      } catch (error) {
        console.error('Erro ao alterar data:', error)
        this.$emit('notification', {
          type: 'error',
          message: 'Erro ao alterar data dos agendamentos'
        })
      } finally {
        this.bulkActionLoading = false
      }
    },

    async acceptNewDate() {
      if (this.selectedSchedules.length === 0) return

      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Agendado', 'Nova data aceita')
        this.$emit('notification', {
          type: 'success',
          message: `Nova data aceita para ${this.selectedSchedules.length} agendamento(s)`
        })
        this.clearSelection()
        await this.loadSchedules()
      } catch (error) {
        console.error('Erro ao aceitar nova data:', error)
        this.$emit('notification', {
          type: 'error',
          message: 'Erro ao aceitar nova data'
        })
      } finally {
        this.bulkActionLoading = false
      }
    },

    async confirmContestado() {
      if (this.selectedSchedules.length === 0) return

      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Agendado', 'Data contestada confirmada')
        this.$emit('notification', {
          type: 'success',
          message: `${this.selectedSchedules.length} agendamento(s) confirmado(s)`
        })
        this.clearSelection()
        await this.loadSchedules()
      } catch (error) {
        console.error('Erro ao confirmar agendamentos:', error)
        this.$emit('notification', {
          type: 'error',
          message: 'Erro ao confirmar agendamentos'
        })
      } finally {
        this.bulkActionLoading = false
      }
    },

    async changeContestadoToAgendado() {
      if (this.selectedSchedules.length === 0 || !this.newDate) return

      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatusWithDate('Agendado', this.newDate, 'Data contestada reagendada')
        this.$emit('notification', {
          type: 'success',
          message: `${this.selectedSchedules.length} agendamento(s) reagendado(s)`
        })
        this.clearSelection()
        await this.loadSchedules()
      } catch (error) {
        console.error('Erro ao reagendar:', error)
        this.$emit('notification', {
          type: 'error',
          message: 'Erro ao reagendar agendamentos'
        })
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
          
        this.$emit('notification', {
          type: 'success',
          message: message
        })
        this.clearSelection()
        await this.loadSchedules()
      } catch (error) {
        console.error('Erro ao cancelar agendamentos:', error)
        this.$emit('notification', {
          type: 'error',
          message: 'Erro ao cancelar agendamentos'
        })
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
        this.$emit('notification', {
          type: 'success',
          message: `${this.selectedSchedules.length} agendamento(s) marcado(s) como em conferência`
        })
        this.clearSelection()
        await this.loadSchedules()
      } catch (error) {
        console.error('Erro ao marcar como em conferência:', error)
        this.$emit('notification', {
          type: 'error',
          message: 'Erro ao marcar agendamentos como em conferência'
        })
      } finally {
        this.bulkActionLoading = false
      }
    },

    async markAsEstoque() {
      if (this.selectedSchedules.length === 0) return
      
      if (!confirm(`Tem certeza que deseja marcar ${this.selectedSchedules.length} agendamento(s) como estoque?`)) {
        return
      }
      
      this.bulkActionLoading = true
      try {
        await this.bulkUpdateStatus('Estoque', 'Agendamento marcado como estoque')
        this.$emit('notification', {
          type: 'success',
          message: `${this.selectedSchedules.length} agendamento(s) marcado(s) como estoque`
        })
        this.clearSelection()
        await this.loadSchedules()
      } catch (error) {
        console.error('Erro ao marcar como estoque:', error)
        this.$emit('notification', {
          type: 'error',
          message: 'Erro ao marcar agendamentos como estoque'
        })
      } finally {
        this.bulkActionLoading = false
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
        this.$emit('notification', {
          type: 'success',
          message: `${this.selectedSchedules.length} cancelamento(s) aceito(s)`
        })
        this.clearSelection()
        await this.loadSchedules()
      } catch (error) {
        console.error('Erro ao aceitar cancelamento:', error)
        this.$emit('notification', {
          type: 'error',
          message: 'Erro ao aceitar cancelamento'
        })
      } finally {
        this.bulkActionLoading = false
      }
    },

    async bulkUpdateStatus(newStatus, comment) {
      // Usar o apiClient global com cache
      const apiClient = window.apiClient
      
      for (const scheduleId of this.selectedSchedules) {
        const payload = {
          status: newStatus,
          historic_entry: {
            user: this.getCurrentUser(),
            action: `Status alterado para ${newStatus}`,
            comment: comment
          }
        }
        
        console.log('📤 Enviando payload para status update:', payload)
        console.log('📍 URL:', `/schedules/${scheduleId}/status`)
        
        await apiClient.request(`/schedules/${scheduleId}/status`, {
          method: 'PATCH',
          data: payload
        })
      }
    },

    async bulkUpdateStatusWithDate(newStatus, newDate, comment) {
      // Usar o apiClient global com cache
      const apiClient = window.apiClient
      
      // Garantir que a data seja formatada corretamente
      const formattedDate = this.formatDateForBackend(newDate)
      console.log(`📤 Data escolhida: ${newDate}`)
      console.log(`📤 Data formatada para backend: ${formattedDate}`)
      
      for (const scheduleId of this.selectedSchedules) {
        console.log(`📤 Atualizando agendamento ${scheduleId} com nova data ${formattedDate} e status ${newStatus}`)
        
        // Buscar o agendamento atual para ter todos os dados
        const scheduleResponse = await apiClient.request(`/schedules/${scheduleId}`, {
          method: 'GET'
        })
        
        const currentSchedule = scheduleResponse.schedule
        
        // Atualizar com todos os campos necessários incluindo a nova data
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
        
        console.log('📤 Payload para atualização:', updatePayload)
        
        // Primeiro atualiza a data e dados
        await apiClient.request(`/schedules/${scheduleId}`, {
          method: 'PUT',
          data: updatePayload
        })
        
        // Depois atualiza o status
        const statusPayload = {
          status: newStatus,
          historic_entry: {
            user: this.getCurrentUser(),
            action: `Status alterado para ${newStatus} com nova data ${this.formatDateForDisplay(formattedDate)}`,
            comment: comment
          }
        }
        
        console.log('📤 Payload para status:', statusPayload)
        
        await apiClient.request(`/schedules/${scheduleId}/status`, {
          method: 'PATCH',
          data: statusPayload
        })
      }
    },

    async bulkUpdateStatusWithDateAndComment(newStatus, newDate) {
      // Usar o apiClient global com cache
      const apiClient = window.apiClient
      const formattedDate = this.formatDateForBackend(newDate)
      
      for (const scheduleId of this.selectedSchedules) {
        // Buscar o agendamento atual para ter todos os dados
        const scheduleResponse = await apiClient.request(`/schedules/${scheduleId}`, {
          method: 'GET'
        })
        
        const currentSchedule = scheduleResponse.schedule
        
        // Gerar comentário personalizado para contestação
        const oldDateFormatted = this.formatDateForDisplay(currentSchedule.date)
        const newDateFormatted = this.formatDateForDisplay(formattedDate)
        const customComment = `A data escolhida (${oldDateFormatted}) está indisponível, a data escolhida pela nossa equipe é ${newDateFormatted}. Por gentileza confirmar em nossa plataforma.`
        
        // Atualizar com todos os campos necessários incluindo a nova data
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
        
        // Primeiro atualiza a data e dados
        await apiClient.request(`/schedules/${scheduleId}`, {
          method: 'PUT',
          data: updatePayload
        })
        
        // Depois atualiza o status
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

    // Função para garantir que a data seja processada corretamente sem problemas de timezone
    formatDateForBackend(dateString) {
      if (!dateString) return null
      
      // Se já está no formato YYYY-MM-DD, manter como está
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.log('📅 Data original:', dateString)
        return dateString
      }
      
      // Se for um objeto Date, formatar corretamente
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      const formattedDate = `${year}-${month}-${day}`
      console.log('📅 Data formatada:', formattedDate)
      return formattedDate
    },

    // Métodos de filtros
    handleFiltersChanged(newFilters) {
      console.log('🔍 Filtros alterados:', newFilters)
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
        console.log('🔍 DEBUG SchedulesList: userData do localStorage:', userData)
        
        if (!userData) {
          console.log('❌ Nenhum dado de usuário encontrado no localStorage')
          return
        }
        
        const user = JSON.parse(userData)
        console.log('👤 SchedulesList - Usuário logado completo:', user)
        console.log('📊 Level access:', user.level_access)
        console.log('🏢 cli_access:', user.cli_access)
        console.log('🏢 cli_access type:', typeof user.cli_access)
        
        // Tratar cli_access se estiver como string
        let cliAccess = user.cli_access
        if (typeof cliAccess === 'string' && cliAccess) {
          try {
            cliAccess = JSON.parse(cliAccess)
            console.log('🔄 cli_access parsed from string:', cliAccess)
          } catch (e) {
            console.log('❌ Erro ao fazer parse do cli_access string:', e)
            cliAccess = null
          }
        }
        
        // Se o usuário tem level_access = 0, tem acesso total
        if (user.level_access === 0) {
          console.log('🔓 Usuário desenvolvedor - buscando todos os clientes via API')
          // Para desenvolvedores, podemos buscar todos os clientes via API
          // Por enquanto, vamos deixar vazio e carregar dinamicamente dos agendamentos
          this.availableClients = []
          console.log('📝 availableClients definido como vazio para desenvolvedor')
          return
        }
        
        // Para outros usuários, usar cli_access
        if (cliAccess && typeof cliAccess === 'object') {
          console.log('✅ cli_access encontrado, processando...')
          
          const cliAccessEntries = Object.entries(cliAccess)
          console.log('📋 Entradas do cli_access:', cliAccessEntries)
          
          const clients = cliAccessEntries.map(([cnpj, data]) => {
            console.log(`🏪 Processando cliente ${cnpj}:`, data)
            return {
              cnpj: cnpj,
              name: data.nome || `Cliente ${cnpj}`,
              number: data.numero || cnpj
            }
          })
          
          console.log('👥 Clientes processados:', clients)
          this.availableClients = clients
          console.log('💾 availableClients definido:', this.availableClients)
        } else {
          console.log('⚠️ Usuário sem cli_access definido ou cli_access não é objeto')
          console.log('⚠️ cli_access value:', cliAccess)
          this.availableClients = []
        }
      } catch (error) {
        console.error('❌ Erro ao carregar clientes disponíveis:', error)
        this.availableClients = []
      }
    },
  },

  mounted() {
    this.loadAvailableClients()
    this.loadSchedules()
  },
}
</script>

<style scoped>

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

/* Bulk actions removido - agora os elementos estão na selected-info */

.contestado-actions,
.solicitado-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.non-level-1-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.date-change-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-change-group input[type="date"] {
  width: 150px;
}

.level-1-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.non-level-1-actions input[type="date"],
.solicitado-actions input[type="date"] {
  width: 150px;
}

.non-level-1-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.contact-text {
  color: #6c757d;
  font-style: italic;
  font-size: 0.875rem;
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

.bulk-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
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

/* Actions alignment corrigido */

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

@media (max-width: 768px) {
  .bulk-actions-bar {
    flex-direction: column;
    align-items: stretch;
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
  
  .table-wrapper {
    max-height: 400px;
  }
}
</style>
