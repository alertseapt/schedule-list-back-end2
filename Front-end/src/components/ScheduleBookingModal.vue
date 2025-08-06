<template>
  <div v-if="showModal" class="modal-overlay" @click="handleModalClick">
    <div class="modal-content medium schedule-booking-modal">
      <!-- Header -->
      <div class="modal-header">
        <h3>
          <i class="fas fa-calendar-plus"></i>
          Criar Agendamento de Marcação
        </h3>
        <button class="btn-close" @click="closeModal">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Errors -->
      <div v-if="errors.length > 0" class="error-container">
        <div
          v-for="(error, index) in errors"
          :key="index"
          class="error-message"
        >
          <i class="fas fa-exclamation-triangle"></i>
          {{ error }}
          <button @click="removeError(index)" class="btn-close-error">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-container">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Criando agendamento de marcação...</p>
      </div>

      <!-- Form Content -->
      <div v-if="!loading" class="modal-body">
        <div class="booking-form">
          <div class="form-section">
            <h4>Informações do Agendamento de Marcação</h4>
            <p class="form-description">
              <i class="fas fa-info-circle"></i>
              Este agendamento servirá como marcação. Os detalhes da NFe e produtos serão adicionados posteriormente.
            </p>

            <!-- Seleção de Estoque -->
            <div class="form-group">
              <label class="form-label required">
                <i class="fas fa-warehouse"></i>
                Estoque de Destino
              </label>
              
              <!-- Caso usuário tenha apenas um cliente -->
              <div v-if="availableClients.length === 1" class="selected-client-display">
                <div class="client-info">
                  <strong>{{ selectedClient.name }}</strong>
                  <span class="client-cnpj">CNPJ: {{ formatCNPJ(selectedClient.cnpj) }}</span>
                </div>
              </div>
              
              <!-- Caso usuário tenha múltiplos clientes -->
              <div v-else class="client-selection-container">
                <div v-if="selectedClient" class="selected-client-info">
                  <div class="client-details">
                    <span class="client-name">{{ selectedClient.name }}</span>
                    <span class="client-cnpj">{{ formatCNPJ(selectedClient.cnpj) }}</span>
                  </div>
                  <button type="button" class="btn btn-outline-primary btn-sm" @click="showClientSelection = true">
                    <i class="fas fa-edit"></i> Alterar
                  </button>
                </div>
                <div v-else>
                  <button type="button" class="btn btn-primary" @click="showClientSelection = true">
                    <i class="fas fa-warehouse"></i> Selecionar Estoque
                  </button>
                </div>
              </div>
            </div>

            <!-- Campos Opcionais -->
            <div class="optional-fields">
              <h5>Informações Opcionais</h5>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">
                    <i class="fas fa-file-invoice"></i>
                    Número da NF-e
                  </label>
                  <input
                    v-model="bookingData.nfe_number"
                    type="text"
                    class="form-control"
                    placeholder="Ex: 123456"
                    maxlength="10"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <i class="fas fa-calendar-alt"></i>
                    Data de Entrega
                  </label>
                  <input
                    v-model="bookingData.delivery_date"
                    type="date"
                    class="form-control"
                    :min="new Date().toISOString().split('T')[0]"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <i class="fas fa-boxes"></i>
                  Volumetria
                </label>
                <input
                  v-model="bookingData.case_count"
                  type="number"
                  class="form-control"
                  placeholder="Quantidade de volumes/caixas"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de seleção de cliente -->
      <div v-if="showClientSelection" class="modal-overlay" @click.self="showClientSelection = false">
        <div class="modal-content small">
          <div class="modal-header">
            <h4>Selecione o Estoque</h4>
            <button class="btn-close" @click="showClientSelection = false">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="clients-list">
              <div
                v-for="client in availableClients"
                :key="client.cnpj"
                class="client-option"
                @click="selectClient(client)"
              >
                <div class="client-option-info">
                  <i class="fas fa-warehouse"></i>
                  <div class="client-option-details">
                    <span class="client-option-name">{{ client.name }}</span>
                    <span class="client-option-cnpj">{{ formatCNPJ(client.cnpj) }}</span>
                  </div>
                </div>
                <i class="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-secondary">
          <i class="fas fa-times"></i>
          Cancelar
        </button>

        <button
          @click="createBookingSchedule"
          :disabled="!canCreate || loading"
          class="btn btn-success"
        >
          <i class="fas fa-check"></i>
          Criar Marcação
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ScheduleBookingModal',

  props: {
    showModal: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      loading: false,
      errors: [],
      availableClients: [],
      selectedClient: null,
      showClientSelection: false,
      bookingData: {
        nfe_number: '',
        delivery_date: '',
        case_count: null,
      },
    }
  },

  computed: {
    canCreate() {
      return this.selectedClient && this.hasValidPermissions
    },

    hasValidPermissions() {
      const currentUser = this.getCurrentUser()
      return currentUser && currentUser.level_access !== 1
    },
  },

  async created() {
    if (this.showModal) {
      await this.loadAvailableClients()
    }
  },

  watch: {
    showModal: {
      async handler(newVal) {
        if (newVal) {
          await this.loadAvailableClients()
        }
      },
      immediate: true,
    },
  },

  methods: {
    closeModal() {
      this.resetModal()
      this.$emit('close')
    },

    resetModal() {
      this.loading = false
      this.errors = []
      this.selectedClient = null
      this.showClientSelection = false
      this.bookingData = {
        nfe_number: '',
        delivery_date: '',
        case_count: null,
      }
    },

    async loadAvailableClients() {
      try {
        const apiClient = window.apiClient
        const response = await apiClient.request('/clients', {
          method: 'GET',
        })

        let allClients = response.data || []
        allClients = allClients.filter(client => client.cnpj)

        const currentUser = this.getCurrentUser()
        
        // Filtrar clientes baseado nas permissões do usuário
        if (currentUser && currentUser.level_access !== 0) {
          if (currentUser.cli_access) {
            const allowedCNPJs = Object.keys(currentUser.cli_access).map(cnpj => cnpj.replace(/[^\d]/g, ''))
            allClients = allClients.filter(client => {
              const clientCnpj = (client.cnpj || '').replace(/[^\d]/g, '')
              return allowedCNPJs.includes(clientCnpj)
            })
          } else {
            allClients = []
          }
        }

        this.availableClients = allClients

        // Se houver apenas um cliente, selecionar automaticamente
        if (this.availableClients.length === 1) {
          this.selectedClient = this.availableClients[0]
        }

      } catch (error) {
        console.error('Erro ao carregar clientes:', error)
        this.showError('Erro ao carregar lista de estoques.')
      }
    },

    selectClient(client) {
      this.selectedClient = client
      this.showClientSelection = false
    },

    async createBookingSchedule() {
      if (!this.canCreate) return

      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        this.showError('Usuário não autenticado. Faça login novamente.')
        return
      }

      if (!this.hasValidPermissions) {
        this.showError('Usuário não possui permissão para criar agendamentos de marcação.')
        return
      }

      this.loading = true
      this.errors = []

      try {
        const clientCnpj = this.selectedClient.cnpj.replace(/[^\d]/g, '')
        
        const scheduleData = {
          // Dados obrigatórios
          client: clientCnpj,
          status: 'Marcação',
          created_by: currentUser.user,
          
          // Dados opcionais
          number: this.bookingData.nfe_number || null,
          date: this.bookingData.delivery_date || null,
          case_count: this.bookingData.case_count || 0,
          
          // Identificadores para agendamento de marcação
          nfe_key: null, // NULL indica que é agendamento de marcação
          supplier: 'Agendamento de Marcação',
          qt_prod: 0,
          info: {
            type: 'booking',
            created_by: currentUser.user,
            created_at: new Date().toISOString(),
            client_name: this.selectedClient.name,
          },
        }

        const apiClient = window.apiClient
        const response = await apiClient.request('/schedules', {
          method: 'POST',
          data: scheduleData,
        })

        console.log('Agendamento de marcação criado:', response)
        this.showSuccess('Agendamento de marcação criado com sucesso!')
        this.$emit('created', response)

        setTimeout(() => {
          this.closeModal()
        }, 1500)

      } catch (error) {
        console.error('Erro ao criar agendamento de marcação:', error)
        
        if (error.response?.status === 403) {
          this.showError('Acesso negado. Usuário não possui permissão para criar agendamentos de marcação.')
        } else if (error.response?.status === 401) {
          this.showError('Token de autenticação inválido. Faça login novamente.')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = 'login.html'
        } else {
          this.showError(
            'Erro ao criar agendamento de marcação: ' + (error.message || 'Erro desconhecido')
          )
        }
      } finally {
        this.loading = false
      }
    },

    getCurrentUser() {
      const userData = localStorage.getItem('user')
      return userData ? JSON.parse(userData) : null
    },

    showError(message) {
      this.errors.push(message)
    },

    showSuccess(message) {
      console.log('Sucesso:', message)
    },

    removeError(index) {
      this.errors.splice(index, 1)
    },

    formatCNPJ(cnpj) {
      if (!cnpj) return ''
      return cnpj.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
      )
    },

    handleModalClick(event) {
      event.stopPropagation()
    },
  },
}
</script>

<style scoped>
.schedule-booking-modal {
  max-width: 600px;
  width: 90%;
}

.form-section {
  margin-bottom: 1.5rem;
}

.form-description {
  background: #e3f2fd;
  border-left: 4px solid #1976d2;
  padding: 12px 16px;
  margin-bottom: 1.5rem;
  border-radius: 4px;
  color: #1565c0;
  font-size: 0.9rem;
}

.form-description i {
  margin-right: 8px;
  color: #1976d2;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
}

.form-label.required::after {
  content: ' *';
  color: #dc2626;
}

.form-label i {
  margin-right: 8px;
  color: #6b7280;
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.9rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.optional-fields {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1.5rem;
}

.optional-fields h5 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #475569;
  font-size: 1rem;
}

/* Client Selection Styles */
.selected-client-display {
  background: #f0f9ff;
  border: 2px solid #0ea5e9;
  border-radius: 8px;
  padding: 1rem;
}

.client-info {
  text-align: center;
}

.client-info strong {
  display: block;
  font-size: 1.1rem;
  color: #0c4a6e;
  margin-bottom: 0.25rem;
}

.client-cnpj {
  color: #0369a1;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.client-selection-container {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-client-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  padding: 1rem;
  width: 100%;
}

.client-details {
  display: flex;
  flex-direction: column;
}

.client-name {
  font-weight: 600;
  color: #0c4a6e;
  margin-bottom: 0.25rem;
}

.client-option-cnpj {
  color: #0369a1;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

/* Client Selection Modal */
.clients-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.client-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background-color 0.15s;
}

.client-option:hover {
  background: #f8fafc;
}

.client-option:last-child {
  border-bottom: none;
}

.client-option-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.client-option-info i {
  color: #3b82f6;
  font-size: 1.2rem;
}

.client-option-details {
  display: flex;
  flex-direction: column;
}

.client-option-name {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
}

.client-option-cnpj {
  color: #6b7280;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

/* Loading and Error States */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.loading-container i {
  font-size: 2rem;
  color: #3b82f6;
  margin-bottom: 1rem;
  animation: spin 1s linear infinite;
}

.error-container {
  margin-bottom: 1rem;
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  margin-bottom: 0.5rem;
}

.error-message i {
  margin-right: 0.5rem;
}

.btn-close-error {
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0.25rem;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .schedule-booking-modal {
    width: 95%;
    margin: 1rem auto;
  }
}
</style>