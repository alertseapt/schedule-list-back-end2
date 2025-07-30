<template>
  <div v-if="showModal" class="modal-overlay" @click="handleModalClick">
    <div class="modal-content medium product-edit-modal">
      <!-- Header -->
      <div class="modal-header">
        <h3>
          <i class="fas fa-edit"></i>
          Editar Produto
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
        <p>Carregando...</p>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <!-- Product Information -->
        <div class="product-info">
          <h4>Informações do Produto</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>Código do Fornecedor:</label>
              <span class="code">{{ editableProduct.supplier_code }}</span>
            </div>
            <div class="info-item">
              <label>Descrição do Fornecedor:</label>
              <span>{{ editableProduct.supplier_description }}</span>
            </div>
            <div class="info-item">
              <label>Quantidade:</label>
              <span
                >{{ editableProduct.quantity }} {{ editableProduct.unit }}</span
              >
            </div>
            <div class="info-item">
              <label>Valor Unitário:</label>
              <span>{{ formatCurrency(editableProduct.unit_value) }}</span>
            </div>
            <div class="info-item">
              <label>Valor Total:</label>
              <span>{{ formatCurrency(editableProduct.total_value) }}</span>
            </div>
            <div class="info-item">
              <label>Fator de Conversão:</label>
              <span>{{ editableProduct.factor || 1 }}</span>
            </div>
          </div>
        </div>

        <!-- Editable Fields -->
        <div class="editable-fields">
          <h4>Campos Editáveis</h4>

          <div class="form-group">
            <label for="client-code">Código do Cliente:</label>
            <input
              id="client-code"
              type="text"
              v-model="editableProduct.client_code"
              class="form-control"
              placeholder="Digite o código do cliente"
            />
          </div>

          <div class="form-group">
            <label for="client-description">Descrição do Cliente:</label>
            <textarea
              id="client-description"
              v-model="editableProduct.client_description"
              class="form-control"
              rows="3"
              placeholder="Digite a descrição do cliente"
              :class="{
                'is-invalid': !editableProduct.client_description && hasChanges,
              }"
            >
            </textarea>
            <div
              v-if="!editableProduct.client_description && hasChanges"
              class="invalid-feedback"
            >
              A descrição do cliente é obrigatória
            </div>
          </div>

          <div class="form-group">
            <label for="factor">Fator de Conversão:</label>
            <input
              id="factor"
              type="number"
              step="0.01"
              min="0.01"
              v-model="editableProduct.factor"
              class="form-control"
              placeholder="1.00"
            />
            <small class="form-text text-muted">
              Fator usado para converter a quantidade do fornecedor para a
              quantidade do cliente
            </small>
          </div>
        </div>

        <!-- History Section -->
        <div class="history-section">
          <div class="history-header">
            <h4>Histórico de Alterações</h4>
            <button
              class="btn btn-sm btn-outline-secondary"
              @click="toggleHistory"
            >
              <i
                :class="
                  showHistory ? 'fas fa-chevron-up' : 'fas fa-chevron-down'
                "
              ></i>
              {{ showHistory ? 'Ocultar' : 'Mostrar' }} Histórico
            </button>
          </div>

          <div v-if="showHistory" class="history-content">
            <div v-if="history.length === 0 && !loading" class="empty-state">
              <i class="fas fa-history"></i>
              <p>Nenhum histórico de alterações encontrado</p>
            </div>

            <div v-else class="history-timeline">
              <div v-for="item in history" :key="item.id" class="history-item">
                <div class="history-date">
                  {{ formatDate(item.created_at) }}
                </div>
                <div class="history-content">
                  <h5>{{ item.action }}</h5>
                  <p>{{ item.description }}</p>
                  <div v-if="item.changes" class="changes">
                    <small>
                      <strong>Alterações:</strong>
                      {{ item.changes }}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button
          v-if="hasChanges"
          @click="resetToOriginal"
          class="btn btn-outline-secondary"
        >
          <i class="fas fa-undo"></i>
          Resetar
        </button>

        <button @click="closeModal" class="btn btn-secondary">Cancelar</button>

        <button
          @click="saveDescription"
          :disabled="!canSave || loading"
          class="btn btn-primary"
        >
          <i class="fas fa-save"></i>
          {{ loading ? 'Salvando...' : 'Salvar Alterações' }}
        </button>
      </div>

      <!-- Changes indicator -->
      <div v-if="hasChanges" class="changes-indicator">
        <i class="fas fa-circle"></i>
        Alterações não salvas
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProductEditModal',

  props: {
    product: {
      type: Object,
      default: () => ({}),
    },
    showModal: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      editableProduct: {},
      loading: false,
      history: [],
      showHistory: false,
      errors: [],
      originalDescription: '',
    }
  },

  computed: {
    hasChanges() {
      return (
        this.editableProduct.client_description !== this.originalDescription
      )
    },

    canSave() {
      return (
        this.hasChanges &&
        this.editableProduct.client_description &&
        this.editableProduct.client_description.trim() !== ''
      )
    },
  },

  watch: {
    product: {
      handler(newProduct) {
        if (newProduct) {
          this.editableProduct = { ...newProduct }
          this.originalDescription = newProduct.client_description || ''
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
      this.editableProduct = {}
      this.loading = false
      this.history = []
      this.showHistory = false
      this.errors = []
      this.originalDescription = ''
    },

    async loadProductHistory() {
      if (!this.product.id && !this.product.supplier_code) return

      this.loading = true
      try {
        // Usar o apiClient global com cache
        const apiClient = window.apiClient
        const identifier = this.product.id || this.product.supplier_code

        const response = await apiClient.request(
          `/products/${identifier}/history`,
          {
            method: 'GET',
          }
        )

        this.history = response.data || []
      } catch (error) {
        console.error('Erro ao carregar histórico:', error)
        this.showError('Erro ao carregar histórico do produto')
      } finally {
        this.loading = false
      }
    },

    async saveDescription() {
      if (!this.canSave) return

      this.loading = true
      this.errors = []

      try {
        // Usar o apiClient global com cache
        const apiClient = window.apiClient

        const updateData = {
          client_description: this.editableProduct.client_description.trim(),
          client_code: this.editableProduct.client_code || '',
          factor: this.editableProduct.factor || 1,
        }

        const response = await apiClient.request(
          '/products/update-description',
          {
            method: 'PUT',
            data: {
              supplier_code: this.product.supplier_code,
              ...updateData,
            },
          }
        )

        this.editableProduct = { ...this.editableProduct, ...response.data }
        this.originalDescription = this.editableProduct.client_description

        this.$emit('updated', this.editableProduct)

        this.showSuccess('Descrição do produto atualizada com sucesso!')

        await this.loadProductHistory()
      } catch (error) {
        console.error('Erro ao salvar descrição:', error)
        this.showError(
          error.response?.data?.message || 'Erro ao salvar descrição do produto'
        )
      } finally {
        this.loading = false
      }
    },

    toggleHistory() {
      this.showHistory = !this.showHistory
      if (this.showHistory && this.history.length === 0) {
        this.loadProductHistory()
      }
    },

    showError(message) {
      this.errors.push(message)
    },

    showSuccess(message) {
      this.$emit('notification', {
        type: 'success',
        message: message,
      })
    },

    removeError(index) {
      this.errors.splice(index, 1)
    },

    formatDate(dateString) {
      if (!dateString) return '-'
      
      // Para datas no formato YYYY-MM-DD, evitar conversão de timezone
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
      }
      
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

    formatCurrency(value) {
      if (!value) return 'R$ 0,00'
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value)
    },

    handleModalClick(event) {
      if (event.target.classList.contains('modal-overlay')) {
        this.closeModal()
      }
    },

    resetToOriginal() {
      this.editableProduct.client_description = this.originalDescription
    },
  },

  mounted() {
    if (this.product) {
      this.editableProduct = { ...this.product }
      this.originalDescription = this.product.client_description || ''
    }
  },
}
</script>
