<template>
  <div v-if="showModal" class="modal-overlay" @click="handleModalClick">
    <div class="modal-content nfe-info-modal large" ref="modal" tabindex="-1">
      <!-- Header -->
      <div class="modal-header">
        <h3>
          <i class="fas fa-file-invoice"></i>
          Informações da NF-e
        </h3>
        <div class="header-buttons">
          <!-- Dropdown para alterar status quando está em Tratativa -->
          <div v-if="canChangeStatusFromTratativa" class="status-change-dropdown me-2">
            <select 
              v-model="selectedNewStatus" 
              @change="changeStatusFromTratativa" 
              class="form-select form-select-sm"
              title="Alterar status do agendamento"
            >
              <option value="">Alterar Status</option>
              <option v-for="status in availableStatusOptions" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>
          </div>

          <button 
            v-if="canMarkAsTratativa"
            class="btn btn-sm btn-warning me-2" 
            @click="markAsTratativa"
            title="Marcar como Em Tratativa"
          >
            <i class="fas fa-exclamation-triangle"></i> Em Tratativa
          </button>
          <button 
            v-if="canEditSchedule"
            class="btn btn-sm btn-outline-primary me-2" 
            @click="openEditModal"
            title="Editar Agendamento"
          >
            <i class="fas fa-cog"></i> Editar
          </button>
          <button class="btn-close" @click="closeModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="modal-tabs">
        <button
          v-for="(section, key) in formattedNfeData"
          :key="key"
          :class="['tab-button', { active: activeTab === key }]"
          @click="setActiveTab(key)"
        >
          <i :class="section.icon"></i>
          {{ section.title }}
        </button>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <!-- General Tab -->
        <div v-if="activeTab === 'general'" class="tab-content">
          <div class="info-grid">
            <div
              v-for="(value, key) in formattedNfeData.general.data"
              :key="key"
              class="info-item"
            >
              <label>{{ key }}:</label>
              <span :class="key === 'Chave da NF-e' ? 'nfe-key' : ''">{{
                value || '-'
              }}</span>
            </div>
          </div>
          
          <!-- Observations Card -->
          <div class="info-item observations-item">
            <label>
              <i class="fas fa-sticky-note"></i>
              Observações do Agendamento:
            </label>
            <span v-if="getObservations() && getObservations().trim()" class="observations-text">
              {{ getObservations() }}
            </span>
            <span v-else class="no-observations">
              <i class="fas fa-info-circle"></i>
              <em>Não há observações para este agendamento</em>
            </span>
          </div>
        </div>

        <!-- Products Tab -->
        <div v-if="activeTab === 'products'" class="tab-content">
          <div
            v-if="formattedNfeData.products.data.length > 0"
            class="products-table-container"
          >
            <table class="products-table">
              <thead>
                <tr>
                  <th>Cód. Fornecedor</th>
                  <th>Descrição Fornecedor</th>
                  <th>Cód. Venda</th>
                  <th>Descrição Venda</th>
                  <th>Quantidade</th>
                  <th>Valor Unit.</th>
                  <th>Valor Total</th>
                  <th>Código EAN</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="product in formattedNfeData.products.data"
                  :key="product.id"
                >
                  <td>{{ product.supplier_code || product.code || '-' }}</td>
                  <td>{{ product.supplier_description || product.description || '-' }}</td>
                  <td>{{ product.client_code || product.code || '-' }}</td>
                  <td>{{ product.client_description || product.description || '-' }}</td>
                  <td>{{ product.quantity }} {{ product.unit }}</td>
                  <td>{{ formatCurrency(product.unit_value) }}</td>
                  <td>{{ formatCurrency(product.total_value) }}</td>
                  <td>{{ product.ean_code || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">
            <i class="fas fa-box-open"></i>
            <p>Nenhum produto encontrado</p>
          </div>
        </div>

        <!-- History Tab -->
        <div v-if="activeTab === 'history'" class="tab-content history-tab-content">
          <div v-if="formattedNfeData.history && formattedNfeData.history.data.length > 0" class="history-container">
            <div class="history-timeline">
              <div
                v-for="entry in formattedNfeData.history.data"
                :key="entry.id"
                class="history-entry"
              >
                <div class="history-icon">
                  <i :class="getHistoryIcon(entry.action)"></i>
                </div>
                <div class="history-content">
                  <div class="history-header">
                    <h5 class="history-action">{{ entry.action }}</h5>
                    <span class="history-timestamp">{{ entry.timestamp }}</span>
                  </div>
                  <div class="history-user">
                    <i class="fas fa-user"></i>
                    Por: <strong>{{ entry.user }}</strong>
                  </div>
                  <div v-if="entry.changes && entry.changes.length > 0" class="history-changes">
                    <div class="changes-grid">
                      <div v-for="change in entry.changes" :key="change" class="change-item">
                        <div class="change-field">{{ change.split(':')[0].trim() }}</div>
                        <div class="change-values">{{ change.split(':')[1].trim() }}</div>
                      </div>
                    </div>
                  </div>
                  <div v-if="entry.comment && !entry.comment.startsWith('Alterações realizadas:')" class="history-comment">
                    <i class="fas fa-comment"></i>
                    <span>{{ entry.comment }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <i class="fas fa-history"></i>
            <h3>Nenhum histórico encontrado</h3>
            <p>Este agendamento ainda não possui histórico de alterações.</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer" style="justify-content: flex-end;">
        <div class="footer-info" style="margin-left: auto;">
          <small class="text-muted">
            <i class="fas fa-info-circle"></i>
            Última atualização:
            {{ formatDate(getLastUpdateFromHistoric().timestamp) }} por
            {{ getLastUpdateFromHistoric().user }}
          </small>
        </div>
      </div>

      <!-- Copy Success Toast -->
      <div v-if="copySuccess" class="copy-toast">
        <i class="fas fa-check"></i>
        Copiado para área de transferência!
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NfeInfoModal',

  props: {
    nfeData: {
      type: Object,
      default: () => ({}),
    },
    showModal: {
      type: Boolean,
      default: false,
    },
    user: {
      type: Object,
      default: () => ({}),
    },
  },

  data() {
    return {
      activeTab: 'general',
      expandedSections: {},
      copySuccess: false,
      selectedNewStatus: ''
    }
  },

  computed: {
    formattedNfeData() {
      if (!this.nfeData) return {}

      return {
        general: {
          title: 'Informações Gerais',
          icon: 'fas fa-file-alt',
          data: {
            'Número da NF-e': this.nfeData.nfe_number || this.nfeData.number,
            'Chave da NF-e': this.nfeData.nfe_key,
            Status: this.nfeData.status,
            'Data de Entrega': this.formatDateOnly(this.nfeData.date),
            Fornecedor: this.getSupplierInfo(),
            Destinatário: this.getClientInfo(),
            Estoque: this.getStockInfo(),
            Volumes: this.getVolumeCount(),
            'Qtd. Produtos': this.nfeData.qt_prod,
            'Valor Total': this.getTotalValue(),
          },
        },
        products: {
          title: 'Produtos',
          icon: 'fas fa-boxes',
          data: this.getProducts(),
        },
        history: {
          title: 'Histórico',
          icon: 'fas fa-history',
          data: this.getHistoryEntries(),
        },
      }
    },

    statusBadgeClass() {
      const statusMap = {
        Solicitado: 'warning',
        Agendado: 'info',
        Conferência: 'success',
        Recebido: 'success', // Compatibilidade com dados antigos
        Tratativa: 'danger',
        Estoque: 'success',
        Recusar: 'danger',
        Recusado: 'dark',
        Cancelado: 'secondary',
      }
      return statusMap[this.nfeData.status] || 'secondary'
    },

    canEditSchedule() {
      console.log('canEditSchedule user:', this.user)
      return this.user && this.user.level_access !== undefined && this.user.level_access !== 1
    },

    canMarkAsTratativa() {
      console.log('canMarkAsTratativa user:', this.user, 'status:', this.nfeData?.status)
      
      // Verificar se o usuário tem permissão (nível diferente de 1)
      if (!this.user || this.user.level_access === undefined || this.user.level_access === 1) {
        return false
      }
      
      // Verificar se o status atual permite mudança para tratativa
      const currentStatus = this.nfeData?.status
      const blockedStatuses = ['Estoque', 'Recusado', 'Cancelado', 'Tratativa']
      
      return currentStatus && !blockedStatuses.includes(currentStatus)
    },

    canChangeStatusFromTratativa() {
      console.log('canChangeStatusFromTratativa user:', this.user, 'status:', this.nfeData?.status)
      
      // Verificar se o usuário tem permissão (nível diferente de 1)
      if (!this.user || this.user.level_access === undefined || this.user.level_access === 1) {
        return false
      }
      
      // Só mostrar dropdown se o status atual for 'Tratativa'
      return this.nfeData?.status === 'Tratativa'
    },

    availableStatusOptions() {
      // Todos os status possíveis exceto o atual (Tratativa)
      return [
        { value: 'Solicitado', label: 'Solicitado' },
        { value: 'Contestado', label: 'Contestado' },
        { value: 'Agendado', label: 'Agendado' },
        { value: 'Conferência', label: 'Em conferência' },
        { value: 'Recebido', label: 'Em conferência' },
        { value: 'Estoque', label: 'Em estoque' },
        { value: 'Cancelar', label: 'Cancelar' },
        { value: 'Cancelado', label: 'Cancelado' },
        { value: 'Recusado', label: 'Recusado' }
      ]
    },
  },

  methods: {
    closeModal() {
      this.$emit('close')
    },

    openEditModal() {
      console.log('🔧 Abrindo modal de edição para:', this.nfeData)
      this.$emit('edit', this.nfeData)
    },

    markAsTratativa() {
      console.log('⚠️ Marcando como tratativa:', this.nfeData)
      this.$emit('mark-tratativa', this.nfeData)
    },

    changeStatusFromTratativa() {
      if (!this.selectedNewStatus) return
      
      console.log('🔄 Alterando status de tratativa para:', this.selectedNewStatus, 'agendamento:', this.nfeData)
      
      this.$emit('change-status', {
        scheduleData: this.nfeData,
        newStatus: this.selectedNewStatus
      })
      
      // Reset do dropdown
      this.selectedNewStatus = ''
    },

    setActiveTab(tab) {
      this.activeTab = tab
    },

    toggleSection(section) {
      this.expandedSections[section] = !this.expandedSections[section]
    },

    formatDate(dateString) {
      if (!dateString) return '-'
      
      // Para datas no formato YYYY-MM-DD, evitar conversão de timezone
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
      }
      
      // Para timestamps completos (ISO format), usar formatação com hora
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      } catch (error) {
        return dateString
      }
    },

    formatDateOnly(dateString) {
      if (!dateString) return '-'
      
      // Para datas no formato YYYY-MM-DD, evitar conversão de timezone
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
      }
      
      // Para outros formatos
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
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

    getVolumeCount() {
      if (this.nfeData.info && this.nfeData.info.case_count) {
        return this.nfeData.info.case_count
      }

      if (this.nfeData.case_count) {
        return this.nfeData.case_count
      }

      if (this.nfeData.volumes) {
        return this.nfeData.volumes
      }

      return '-'
    },

    getTotalValue() {
      if (
        this.nfeData.total_value !== undefined &&
        this.nfeData.total_value !== null &&
        this.nfeData.total_value > 0
      ) {
        return this.formatCurrency(this.nfeData.total_value)
      }

      return '-'
    },

    getProducts() {
      if (
        this.nfeData.info &&
        this.nfeData.info.products &&
        Array.isArray(this.nfeData.info.products)
      ) {
        return this.nfeData.info.products
      }

      if (this.nfeData.products && Array.isArray(this.nfeData.products)) {
        return this.nfeData.products
      }

      return []
    },

    getSupplierInfo() {
      if (this.nfeData.info) {
        const supplierName = this.nfeData.info.supplier_name || ''
        const supplierCnpj = this.nfeData.info.supplier_cnpj || ''

        if (supplierName && supplierCnpj) {
          return `${supplierName} - CNPJ: ${supplierCnpj}`
        } else if (supplierName) {
          return supplierName
        } else if (supplierCnpj) {
          return `CNPJ: ${supplierCnpj}`
        }
      }

      return this.nfeData.supplier_name || this.nfeData.supplier || '-'
    },

    getClientInfo() {
      if (this.nfeData.info) {
        const clientName = this.nfeData.info.client_name || ''
        const clientCnpj = this.nfeData.info.client_cnpj || ''

        if (clientName && clientCnpj) {
          return `${clientName} - CNPJ: ${clientCnpj}`
        } else if (clientName) {
          return clientName
        } else if (clientCnpj) {
          return `CNPJ: ${clientCnpj}`
        }
      }

      return this.nfeData.client_name || this.nfeData.client || '-'
    },

    getStockInfo() {
      if (this.nfeData.client_info) {
        const stockName = this.nfeData.client_info.name
        const stockNumber = this.nfeData.client_info.number
        const stockCnpj = this.nfeData.client_cnpj || this.nfeData.client

        let stockInfo = ''

        if (stockName && stockName !== `Cliente ${stockCnpj}`) {
          stockInfo += stockName
        }

        if (stockNumber && stockNumber !== stockCnpj) {
          if (stockInfo) stockInfo += ' '
          stockInfo += `(Nº ${stockNumber})`
        }

        if (stockCnpj) {
          if (stockInfo) stockInfo += ' - '
          stockInfo += `CNPJ: ${stockCnpj}`
        }

        return stockInfo || '-'
      }

      const stockCnpj = this.nfeData.client_cnpj || this.nfeData.client
      return stockCnpj ? `CNPJ: ${stockCnpj}` : '-'
    },

    getLastUpdateFromHistoric() {
      if (this.nfeData.historic && typeof this.nfeData.historic === 'object') {
        let latestTimestamp = null
        let latestEntry = null

        Object.values(this.nfeData.historic).forEach(entry => {
          if (entry && entry.timestamp) {
            const entryTimestamp = new Date(entry.timestamp)
            if (!latestTimestamp || entryTimestamp > latestTimestamp) {
              latestTimestamp = entryTimestamp
              latestEntry = entry
            }
          }
        })

        if (latestEntry) {
          return {
            timestamp: latestTimestamp.toISOString(),
            user: latestEntry.user || 'Sistema',
          }
        }
      }

      return {
        timestamp: this.nfeData.updated_at || this.nfeData.created_at,
        user: 'Sistema',
      }
    },

    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text)
        this.copySuccess = true
        setTimeout(() => {
          this.copySuccess = false
        }, 2000)
      } catch (error) {
        console.error('Erro ao copiar para área de transferência:', error)
      }
    },

    copySection(sectionData) {
      const text = JSON.stringify(sectionData, null, 2)
      this.copyToClipboard(text)
    },

    copyFullData() {
      const text = JSON.stringify(this.nfeData, null, 2)
      this.copyToClipboard(text)
    },

    formatJsonData(data, level = 0) {
      if (typeof data !== 'object' || data === null) {
        return data
      }

      const indent = '  '.repeat(level)
      const nextIndent = '  '.repeat(level + 1)

      if (Array.isArray(data)) {
        if (data.length === 0) return '[]'

        let result = '[\n'
        data.forEach((item, index) => {
          result += nextIndent + this.formatJsonData(item, level + 1)
          if (index < data.length - 1) result += ','
          result += '\n'
        })
        result += indent + ']'
        return result
      } else {
        const keys = Object.keys(data)
        if (keys.length === 0) return '{}'

        let result = '{\n'
        keys.forEach((key, index) => {
          result +=
            nextIndent +
            `"${key}": ${this.formatJsonData(data[key], level + 1)}`
          if (index < keys.length - 1) result += ','
          result += '\n'
        })
        result += indent + '}'
        return result
      }
    },

    getHistoryEntries() {
      if (!this.nfeData.historic || typeof this.nfeData.historic !== 'object') {
        return []
      }

      const entries = Object.entries(this.nfeData.historic)
        .map(([key, entry]) => ({
          id: key,
          timestamp: this.formatDate(entry.timestamp),
          user: entry.user || 'Sistema',
          action: this.getFormattedAction(entry),
          changes: entry.changes || [],
          comment: entry.comment || '',
          rawEntry: entry
        }))
        .sort((a, b) => {
          const dateA = new Date(a.rawEntry.timestamp || a.timestamp)
          const dateB = new Date(b.rawEntry.timestamp || b.timestamp)
          return dateB - dateA
        })

      return entries
    },

    getObservations() {
      // Retornar as observações do agendamento ou string vazia se não houver
      return this.nfeData.observations || ''
    },

    getFormattedAction(entry) {
      if (entry.changes && entry.changes.length > 0) {
        const changeCount = entry.changes.length
        const mainChange = entry.changes[0].split(':')[0] // Pega o nome do campo da primeira mudança
        
        if (changeCount === 1) {
          return `${mainChange} alterado`
        } else {
          return `${changeCount} campos alterados`
        }
      }
      
      return entry.action || 'Alteração realizada'
    },

    getHistoryIcon(action) {
      if (!action) return 'fas fa-question-circle'
      
      const actionLower = action.toLowerCase()
      
      if (actionLower.includes('criado') || actionLower.includes('created')) {
        return 'fas fa-plus-circle text-success'
      } else if (actionLower.includes('status')) {
        return 'fas fa-exchange-alt text-info'
      } else if (actionLower.includes('data') || actionLower.includes('date')) {
        return 'fas fa-calendar-alt text-warning'
      } else if (actionLower.includes('editado') || actionLower.includes('edit')) {
        return 'fas fa-edit text-primary'
      } else if (actionLower.includes('cancelado') || actionLower.includes('cancel')) {
        return 'fas fa-times-circle text-danger'
      } else if (actionLower.includes('conferência') || actionLower.includes('conferencia') || actionLower.includes('received')) {
        return 'fas fa-check-circle text-success'
      } else if (actionLower.includes('contestado') || actionLower.includes('contest')) {
        return 'fas fa-exclamation-triangle text-warning'
      } else {
        return 'fas fa-history text-secondary'
      }
    },

    handleModalClick(event) {
      if (event.target.classList.contains('modal-overlay')) {
        this.closeModal()
      }
    },
  },

  mounted() {
    console.log('🔍 NfeInfoModal montado:', { showModal: this.showModal, nfeData: this.nfeData });
    this.$nextTick(() => {
      const modal = this.$refs.modal
      if (modal) {
        modal.focus()
      }
    })
  },

  watch: {
    showModal(newVal) {
      console.log('🔍 showModal changed:', newVal);
    },
    nfeData(newVal) {
      console.log('🔍 nfeData changed:', newVal);
    }
  },
}
</script>

<style scoped>
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-buttons .btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.header-buttons .btn-warning {
  font-weight: 600;
}

.status-change-dropdown {
  display: flex;
  align-items: center;
}

.status-change-dropdown .form-select-sm {
  min-width: 140px;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  border: 2px solid #ffc107;
  border-radius: 0.375rem;
  background-color: #fff3cd;
  color: #664d03;
  font-weight: 500;
}

.status-change-dropdown .form-select-sm:focus {
  border-color: #ffb300;
  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
  outline: none;
}

.status-change-dropdown .form-select-sm:hover {
  background-color: #fff8e1;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #6c757d;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.btn-close:hover {
  color: #495057;
  background-color: #f8f9fa;
}

/* Modal body height adjustment for history tab */
.modal-body {
  min-height: 60vh;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* History Tab Styles */
.history-tab-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.history-container {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #007bff #f8f9fa;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.history-container::-webkit-scrollbar {
  width: 6px;
}

.history-container::-webkit-scrollbar-track {
  background: #f8f9fa;
  border-radius: 3px;
}

.history-container::-webkit-scrollbar-thumb {
  background: #007bff;
  border-radius: 3px;
}

.history-container::-webkit-scrollbar-thumb:hover {
  background: #0056b3;
}

.history-timeline {
  position: relative;
  padding: 1rem 3rem 1rem 3rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100% !important;
  min-height: 397px;
}

.history-timeline::before {
  content: '';
  position: absolute;
  left: 1.6rem;
  top: 1rem;
  bottom: 1rem;
  width: 5px;
  height: 40rem;
  background: linear-gradient(to bottom, #007bff, #ffffff);
}

.history-entry {
  position: relative;
  margin-bottom: 1.5rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1rem;
  border-left: 4px solid #007bff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.history-entry:hover {
  background: #e9ecef;
  transform: translateX(2px);
  transition: all 0.2s ease;
}

.history-icon {
  position: absolute;
  left: -2.5rem;
  top: 1rem;
  width: 2rem;
  height: 2rem;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: 2px solid #007bff;
}

.history-icon i {
  font-size: 0.875rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.history-action {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
}

.history-timestamp {
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 500;
}

.history-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: #6c757d;
}

.history-user strong {
  color: #495057;
}

.history-changes {
  margin-bottom: 0.75rem;
}

.changes-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.change-item {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 0.75rem;
  padding: 0.5rem;
  background: rgba(0, 123, 255, 0.05);
  border-radius: 0.25rem;
  border-left: 3px solid #007bff;
}

.change-field {
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
  display: flex;
  align-items: center;
}

.change-values {
  font-size: 0.875rem;
  color: #6c757d;
  font-family: 'Courier New', monospace;
  background: rgba(255, 255, 255, 0.7);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #e9ecef;
}

.history-comment {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 123, 255, 0.1);
  border-radius: 0.25rem;
  border-left: 3px solid #007bff;
}

.history-comment i {
  color: #007bff;
  margin-top: 0.125rem;
}

.history-comment span {
  font-size: 0.875rem;
  color: #495057;
  line-height: 1.4;
}

/* Empty state for history */
.history-tab-content .empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 3rem 1rem;
}

.history-tab-content .empty-state i {
  font-size: 3rem;
  color: #dee2e6;
  margin-bottom: 1rem;
}

.history-tab-content .empty-state h3 {
  color: #6c757d;
  margin-bottom: 0.5rem;
}

.history-tab-content .empty-state p {
  color: #adb5bd;
  margin: 0;
}

/* Estilos específicos para a tabela de produtos no modal NFe */
.nfe-info-modal .products-table {
  min-width: 100%;
  table-layout: fixed;
}

.nfe-info-modal .products-table-container {
  overflow-x: hidden;
  max-width: 100%;
}

/* Definir larguras específicas para cada coluna do modal NFe */
.nfe-info-modal .products-table th:nth-child(1) { width: 12%; }  /* Cód. Fornecedor */
.nfe-info-modal .products-table th:nth-child(2) { width: 20%; }  /* Descrição Fornecedor - REDUZIDA */
.nfe-info-modal .products-table th:nth-child(3) { width: 12%; }  /* Cód. Venda */
.nfe-info-modal .products-table th:nth-child(4) { width: 20%; }  /* Descrição Venda */
.nfe-info-modal .products-table th:nth-child(5) { width: 10%; }  /* Quantidade */
.nfe-info-modal .products-table th:nth-child(6) { width: 10%; }  /* Valor Unit. */
.nfe-info-modal .products-table th:nth-child(7) { width: 10%; }  /* Valor Total */
.nfe-info-modal .products-table th:nth-child(8) { width: 12%; }  /* Código EAN */

/* Tornar as descrições expansíveis com quebra de linha */
.nfe-info-modal .products-table td:nth-child(2),
.nfe-info-modal .products-table td:nth-child(4) {
  word-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  line-height: 1.3;
  max-width: 0; /* Força o uso da largura definida */
}

/* Observations Card Adjustments */
.observations-item {
  margin-top: 1.5rem;
}

.observations-item label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.observations-item label i {
  color: #007bff;
}

.observations-item .observations-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.5;
}

.observations-item .no-observations {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6c757d;
  font-style: italic;
}

.observations-item .no-observations i {
  color: #dee2e6;
  font-size: 1rem;
}
</style>
