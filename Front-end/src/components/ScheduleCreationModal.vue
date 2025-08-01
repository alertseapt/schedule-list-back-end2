<template>
  <div v-if="showModal" class="modal-overlay" @click="handleModalClick">
    <div class="modal-content large schedule-creation-modal">
      <!-- Header -->
      <div class="modal-header">
        <h3>
          <i class="fas fa-plus-circle"></i>
          Criar Novo Agendamento
        </h3>
        <button class="btn-close" @click="closeModal">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Progress Steps -->
      <div class="progress-steps">
        <div :class="['step', stepClasses[1]]">
          <div class="step-number">1</div>
          <div class="step-label">Upload XML</div>
        </div>
        <div :class="['step', stepClasses[2]]">
          <div class="step-number">2</div>
          <div class="step-label">Informações</div>
        </div>
        <div :class="['step', stepClasses[3]]">
          <div class="step-number">3</div>
          <div class="step-label">Produtos</div>
        </div>
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
        <p>Processando...</p>
        <div v-if="uploadProgress > 0" class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: uploadProgress + '%' }"
          ></div>
        </div>
      </div>

      <!-- Loading Prefill -->
      <div v-if="loadingPrefill" class="loading-container prefill-loading">
        <div class="prefill-spinner">
          <i class="fas fa-sync-alt fa-spin"></i>
        </div>
        <h3 class="prefill-title">Verificando Produtos</h3>
        <p class="prefill-message">Consultando produtos já cadastrados e aplicando pré-preenchimento...</p>
        <div class="prefill-progress">
          <div class="prefill-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <small class="prefill-help">
          <i class="fas fa-info-circle"></i>
          Produtos já cadastrados serão pré-preenchidos e bloqueados para alteração
        </small>
      </div>

      <!-- Step 1: Upload XML -->
      <div v-if="currentStep === 1 && !loading && !loadingPrefill" class="modal-body">
        <div class="upload-section">
          <div
            class="upload-area"
            @drop="handleDrop"
            @dragover.prevent
            @dragenter.prevent
          >
            <i class="fas fa-upload"></i>
            <h4>Arraste o arquivo XML da NFe aqui</h4>
            <p>ou clique para selecionar</p>
            <input
              type="file"
              accept=".xml"
              @change="handleFileSelect"
              id="xml-file-input"
              style="display: none"
            />
            <label for="xml-file-input" class="btn btn-primary">
              <i class="fas fa-folder-open"></i>
              Selecionar Arquivo
            </label>
          </div>

          <div v-if="selectedFile" class="file-info">
            <i class="fas fa-file-code"></i>
            <span>{{ selectedFile.name }}</span>
            <span class="file-size"
              >({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span
            >
          </div>
        </div>
      </div>

      <!-- Step 2: NFe Information -->
      <div v-if="currentStep === 2 && !loading && !loadingPrefill" class="modal-body">
        <div class="nfe-info">
          <h4>Informações da NFe</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>Número da NFe:</label>
              <span>{{ nfeData.number }}</span>
            </div>
            <div class="info-item">
              <label>Fornecedor:</label>
              <span>{{ nfeData.supplier_name }}</span>
            </div>
            <div class="info-item">
              <label>CNPJ Fornecedor:</label>
              <span>{{ formatCNPJ(nfeData.supplier_cnpj) }}</span>
            </div>
            <div class="info-item">
              <label>Destinatário:</label>
              <span>{{ nfeData.client_name }}</span>
            </div>
            <div class="info-item">
              <label>CNPJ Destinatário:</label>
              <span>{{ formatCNPJ(nfeData.client_cnpj) }}</span>
            </div>
            <div class="info-item">
              <label>Volumes:</label>
              <span>{{ nfeData.case_count }}</span>
            </div>
            <div class="info-item">
              <label>Qtd. Total Produtos:</label>
              <span>{{ totalQuantity }}</span>
            </div>
            <div class="info-item">
              <label>Valor Total:</label>
              <span>{{ formatCurrency(totalValue) }}</span>
            </div>
          </div>

          <!-- Container destacado para seleção de estoque e data -->
          <div class="estoque-data-container">
            <!-- Estoque Selection -->
            <div class="client-selection">
              <h5>Estoque Selecionado</h5>
              <div v-if="selectedClient" class="selected-client-info">
                <div class="info-item">
                  <label>Nome:</label>
                  <span>{{ selectedClient.name }}</span>
                </div>
                <div class="info-item">
                  <label>CNPJ:</label>
                  <span>{{ formatCNPJ(selectedClient.cnpj) }}</span>
                </div>
                <div v-if="selectedClient.numero" class="info-item">
                  <label>Número:</label>
                  <span>{{ selectedClient.numero }}</span>
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm mt-2 btn-alterar-estoque" @click="openClientSelectionModal">
                  <i class="fas fa-edit"></i> Alterar Estoque
                </button>
              </div>
              <div v-else>
                <button type="button" class="btn btn-primary btn-alterar-estoque" @click="openClientSelectionModal">
                  <i class="fas fa-warehouse"></i> Selecionar Estoque
                </button>
                <small class="text-muted d-block mt-2">Clique para escolher o estoque de destino</small>
              </div>
            </div>

            <!-- Delivery Date Selection -->
            <div class="delivery-date-selection mt-3">
              <h5>Data de Entrega Desejada</h5>
              <div class="date-input-container">
                <label for="scheduledDate">Selecione a data para entrega física:</label>
                <input
                  type="date"
                  id="scheduledDate"
                  v-model="scheduledDate"
                  class="form-control"
                  :min="new Date().toISOString().split('T')[0]"
                  required
                />
                <small class="help-text">Esta será a data para agendamento da entrega física das mercadorias</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de seleção de estoque/cliente -->
      <div v-if="showClientSelectionModal" class="modal-overlay" @click.self="closeClientSelectionModal">
        <div class="modal-content small">
          <div class="modal-header">
            <h4>Selecione o Estoque</h4>
            <button class="btn-close" @click="closeClientSelectionModal"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">
            <!-- Loading state for clients -->
            <div v-if="loadingClients" class="loading-clients-container">
              <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
              </div>
              <p class="loading-text">Carregando opções de estoque...</p>
              <small class="loading-subtext">Processando permissões e estoques disponíveis</small>
            </div>
            
            <!-- Clients list -->
            <div v-else class="estoque-lista-vertical">
              <div v-for="client in clients" :key="client.cnpj" class="estoque-lista-item">
                <div class="estoque-lista-info">
                  <i class="fas fa-warehouse"></i>
                  <span class="estoque-nome">{{ client.name }}</span>
                  <span class="estoque-cnpj">CNPJ: {{ formatCNPJ(client.cnpj) }}</span>
                  <span v-if="client.numero" class="estoque-numero">Nº: {{ client.numero }}</span>
                </div>
                <button class="btn btn-primary btn-sm btn-selecionar-estoque" @click.stop="selectClient(client)">
                  Selecionar
                </button>
              </div>
              <div v-if="clients.length === 0" class="text-muted estoque-lista-vazia">
                <i class="fas fa-info-circle"></i>
                Nenhum estoque disponível para seu usuário.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Products -->
      <div v-if="currentStep === 3 && !loading && !loadingPrefill" class="modal-body">
        <div class="products-section">
          <h4>Produtos da NFe</h4>
          <div class="products-table-container">
            <table class="products-table">
              <thead>
                <tr>
                  <th>Cód. Forn.</th>
                  <th>
                    Cód. Venda
                    <i class="fas fa-edit" title="Editável"></i>
                  </th>
                  <th>Descrição Fornecedor</th>
                  <th>
                    Descrição Venda
                    <i class="fas fa-edit" title="Editável"></i>
                  </th>
                  <th>Quant.</th>
                  <th>
                    Fator
                    <i
                      class="fas fa-question-circle"
                      title="Fator de conversão"
                    ></i>
                  </th>
                  <th>Valor Un.</th>
                  <th>Valor Total</th>
                  <th>
                    Código EAN
                    <i class="fas fa-edit" title="Editável"></i>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="product in products"
                  :key="product.id"
                  :class="{ 'product-locked': product.isLocked }"
                >
                  <td :title="product.supplier_code">
                    <strong>{{ product.supplier_code }}</strong>
                    <i v-if="product.isLocked" class="fas fa-lock product-lock-icon" title="Produto já cadastrado - campos bloqueados"></i>
                  </td>
                  <td>
                    <input
                      v-model="product.client_code"
                      :disabled="product.isLocked"
                      @change="updateProduct(product)"
                      class="form-control form-control-sm"
                    />
                  </td>
                  <td :title="product.supplier_description" class="description-cell">
                    {{ product.supplier_description }}
                  </td>
                  <td>
                    <input
                      v-model="product.client_description"
                      :disabled="product.isLocked"
                      @change="updateProduct(product)"
                      class="form-control form-control-sm"
                    />
                  </td>
                  <td>{{ product.quantity }} {{ product.unit }}</td>
                  <td>
                    <input
                      v-model="product.factor"
                      type="number"
                      step="0.01"
                      @change="updateProduct(product)"
                      class="form-control form-control-sm"
                    />
                  </td>
                  <td>{{ formatCurrency(product.unit_value) }}</td>
                  <td>{{ formatCurrency(product.total_value) }}</td>
                  <td>
                    <input
                      v-model="product.ean_code"
                      @change="updateProduct(product)"
                      class="form-control form-control-sm"
                      placeholder="Código EAN"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button
          v-if="currentStep > 1"
          @click="previousStep"
          :disabled="loadingPrefill"
          class="btn btn-secondary"
        >
          <i class="fas fa-arrow-left"></i>
          Anterior
        </button>

        <button
          v-if="currentStep < 3"
          @click="nextStep"
          :disabled="
            (currentStep === 1 && !canProceedToStep2) ||
            (currentStep === 2 && !canProceedToStep3) ||
            loadingPrefill
          "
          class="btn btn-primary"
        >
          <template v-if="loadingPrefill">
            <i class="fas fa-spinner fa-spin"></i>
            Verificando...
          </template>
          <template v-else>
            Próximo
            <i class="fas fa-arrow-right"></i>
          </template>
        </button>

        <button
          v-if="currentStep === 3"
          @click="createSchedule"
          :disabled="!canCreateSchedule || loading"
          class="btn btn-success"
        >
          <i class="fas fa-check"></i>
          Efetivar Agendamento
        </button>
      </div>

      <!-- Product Edit Modal -->
      <product-edit-modal
        v-if="showProductEditModal"
        :product="selectedProduct"
        :show-modal="showProductEditModal"
        @close="closeProductEditModal"
        @updated="updateProduct"
      >
      </product-edit-modal>
    </div>
  </div>
</template>

<script>
import ProductEditModal from './ProductEditModal.vue'

export default {
  name: 'ScheduleCreationModal',

  components: {
    ProductEditModal,
  },

  props: {
    showModal: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      currentStep: 1,
      selectedFile: null,
      nfeData: {},
      products: [],
      loading: false,
      errors: [],
      uploadProgress: 0,
      showProductEditModal: false,
      selectedProduct: null,
      clients: [],
      selectedClient: null,
      showClientSelectionModal: false,
      loadingClients: false,
      scheduledDate: '',
      loadingPrefill: false, // Novo estado para loading de pré-preenchimento
    }
  },

  computed: {
    canProceedToStep2() {
      return (
        this.selectedFile &&
        this.nfeData &&
        Object.keys(this.nfeData).length > 0
      )
    },

    canProceedToStep3() {
      return this.nfeData && this.products.length > 0 && this.selectedClient && this.scheduledDate
    },

    canCreateSchedule() {
      return (
        this.products.length > 0 && this.selectedClient && this.scheduledDate
      )
    },

    stepClasses() {
      return {
        1: { active: this.currentStep === 1, completed: this.currentStep > 1 },
        2: { active: this.currentStep === 2, completed: this.currentStep > 2 },
        3: { active: this.currentStep === 3, completed: false },
      }
    },

    totalValue() {
      return this.products.reduce(
        (total, product) => total + (product.total_value || 0),
        0
      )
    },

    totalQuantity() {
      return this.products.reduce(
        (total, product) => total + (product.quantity || 0),
        0
      )
    },

    isClientAutoSelected() {
      const currentUser = this.getCurrentUser()
      return (
        currentUser &&
        currentUser.cli_access &&
        this.nfeData.client_cnpj &&
        currentUser.cli_access[this.nfeData.client_cnpj]
      )
    },

    hasCreatePermission() {
      const currentUser = this.getCurrentUser()
      return (
        currentUser &&
        currentUser.level_access !== undefined &&
        currentUser.level_access >= 0 // Usuários nível 1 PODEM criar
      )
    },

    createButtonText() {
      return 'Efetivar Agendamento'
    },
  },

  methods: {
    closeModal() {
      this.resetModal()
      this.$emit('close')
    },

    resetModal() {
      this.currentStep = 1
      this.selectedFile = null
      this.nfeData = {}
      this.products = []
      this.loading = false
      this.loadingPrefill = false
      this.errors = []
      this.uploadProgress = 0
      this.selectedClient = null
      this.scheduledDate = ''
    },

    async handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        this.selectedFile = file
        await this.parseAndExtractXML()
      }
    },

    async handleDrop(event) {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file && file.name.endsWith('.xml')) {
        this.selectedFile = file
        await this.parseAndExtractXML()
      } else {
        this.showError('Por favor, selecione um arquivo XML válido')
      }
    },

    async parseAndExtractXML() {
      if (!this.selectedFile) return

      this.loading = true
      this.errors = []
      this.uploadProgress = 0

      try {
        const xmlText = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = e => resolve(e.target.result)
          reader.onerror = e => reject(e)
          reader.readAsText(this.selectedFile)
        })

        const { nfeData, products } = this.parseNFeXML(xmlText)
        this.uploadProgress = 50

        // VERIFICAÇÃO DE DUPLICIDADE - PRIMEIRA ETAPA
        console.log('🔍 Verificando duplicidade de chave NFe na primeira etapa...')
        
        if (nfeData.nfe_key) {
          try {
            const apiClient = window.apiClient
            const duplicateCheckResponse = await apiClient.request('/schedules/check-duplicate', {
              method: 'POST',
              data: { nfe_key: nfeData.nfe_key }
            })
            
            if (!duplicateCheckResponse.success) {
              // NFe duplicada encontrada
              const errorMessage = duplicateCheckResponse.message || 'NFe já possui agendamento'
              console.log('❌ NFe duplicada detectada na primeira etapa:', errorMessage)
              
              this.showError(errorMessage)
              this.nfeData = {}
              this.products = []
              this.selectedFile = null
              return
            }
            
            console.log('✅ NFe não duplicada - prosseguindo com processamento')
          } catch (duplicateError) {
            console.error('❌ Erro ao verificar duplicidade:', duplicateError)
            
            // Se for erro 409 (conflict), é uma duplicata
            if (duplicateError.response?.status === 409) {
              const errorMessage = duplicateError.response?.data?.message || 'Esta NFe já possui um agendamento ativo'
              this.showError(errorMessage)
              this.nfeData = {}
              this.products = []
              this.selectedFile = null
              return
            }
            
            // Outros erros são tratados como problemas de conexão
            console.warn('⚠️ Erro de conexão na verificação de duplicidade, prosseguindo:', duplicateError.message)
          }
        }

        // Continuação do processamento normal
        this.nfeData = nfeData
        this.products = products
        this.uploadProgress = 100

        // Execute carregamento de clientes disponíveis com timeout para não travar a interface
        this.loadAvailableClientsWithTimeout().then(() => {
          console.log('Carregamento de clientes concluído')
        }).catch(() => {
          console.log('Timeout no carregamento de clientes')
        })

        this.showSuccess('XML processado com sucesso!')
      } catch (error) {
        console.error('Erro ao processar XML:', error)

        if (
          error.message &&
          (error.message.includes('CNPJ do destinatário não encontrado') ||
            error.message.includes('não possui acesso ao cliente') ||
            error.message.includes('não autenticado'))
        ) {
          this.showError(error.message)
        } else {
          this.showError(
            'Erro ao processar arquivo XML: ' +
              (error.message || 'Erro desconhecido')
          )
        }

        this.nfeData = {}
        this.products = []
        this.selectedFile = null
      } finally {
        this.loading = false
      }
    },

    parseNFeXML(xmlText) {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml')

      const ide = xmlDoc.querySelector('ide')
      const emit = xmlDoc.querySelector('emit')
      const dest = xmlDoc.querySelector('dest')
      const vol = xmlDoc.querySelector('vol')
      const infNFe = xmlDoc.querySelector('infNFe')

      const nfe_key = infNFe?.getAttribute('Id')?.replace(/^NFe/, '') || ''

      const nfeData = {
        number: ide?.querySelector('nNF')?.textContent || '',
        nfe_key: nfe_key,
        client_cnpj: dest?.querySelector('CNPJ')?.textContent || '',
        client_name: dest?.querySelector('xNome')?.textContent || '',
        supplier_cnpj: emit?.querySelector('CNPJ')?.textContent || '',
        supplier_name: emit?.querySelector('xNome')?.textContent || '',
        case_count: parseInt(vol?.querySelector('qVol')?.textContent || '0'),
        date: ide?.querySelector('dhEmi')?.textContent?.slice(0, 10) || '',
        qt_prod: 0,
        products: [],
      }

      const products = []
      const detList = xmlDoc.querySelectorAll('det')

      detList.forEach((det, index) => {
        const prod = det.querySelector('prod')
        if (prod) {
          const supplierCode = prod.querySelector('cProd')?.textContent || ''
          const supplierDescription = prod.querySelector('xProd')?.textContent || ''
          
          products.push({
            id: `product_${index}_${Date.now()}`, // Unique ID for each product
            item: det.querySelector('nItem')?.textContent || '',
            code: supplierCode,
            supplier_code: supplierCode,
            client_code: '', // VAZIO inicialmente - será preenchido apenas pelo prefill ou como padrão no else
            ean_code: prod.querySelector('cEAN')?.textContent || '',
            description: supplierDescription,
            supplier_description: supplierDescription,
            client_description: '', // VAZIO inicialmente - será preenchido apenas pelo prefill ou como padrão no else
            ncm: prod.querySelector('NCM')?.textContent || '',
            quantity: parseFloat(
              prod.querySelector('qCom')?.textContent || '0'
            ),
            unit: prod.querySelector('uCom')?.textContent || '',
            unit_value: parseFloat(
              prod.querySelector('vUnCom')?.textContent || '0'
            ),
            total_value: parseFloat(
              prod.querySelector('vProd')?.textContent || '0'
            ),
            factor: 1, // Valor padrão para fator
            isLocked: false // Inicialmente não bloqueado
          })
        }
      })

      nfeData.products = products
      nfeData.qt_prod = products.length

      console.log(
        'JSON resultante do parse do XML NFe:',
        JSON.stringify(nfeData, null, 2)
      )
      

      return { nfeData, products }
    },

    async uploadAndParseXML() {
      this.showError(
        'O parseamento do XML agora é feito no navegador. Use a nova função de upload.'
      )
    },

    async checkExistingProducts() {
      if (!this.products.length || !this.selectedClient) return

      try {
        console.log('🔍 Buscando pré-preenchimento para produtos...')
        
        // Usar o apiClient global com cache
        const apiClient = window.apiClient

        // Preparar dados para a API de pré-preenchimento
        const productsToCheck = this.products.map(product => ({
          supp_code: product.supplier_code || product.code,
          supp_cnpj: this.nfeData.supplier_cnpj
        }))

        // Chamar API de pré-preenchimento em lote
        const response = await apiClient.request('/products/batch-prefill', {
          method: 'POST',
          data: {
            products: productsToCheck,
            cliCnpj: this.selectedClient.cnpj.replace(/[^\d]/g, '')
          }
        })

        if (!response.success) {
          console.error('Erro ao buscar pré-preenchimento:', response.message)
          return
        }

        console.log(`📊 Pré-preenchimento: ${response.summary.found} de ${response.summary.total} produtos encontrados`)

        // Aplicar pré-preenchimento nos produtos
        response.data.forEach((prefillResult, index) => {
          const product = this.products[index]
          
          console.log(`🔍 PRODUTO ${index + 1}: ${prefillResult.supp_code}`)
          console.log(`   has_data: ${prefillResult.has_data}`)
          console.log(`   prefill_data: ${!!prefillResult.prefill_data}`)
          console.log(`   client_code antes:`, product.client_code)
          console.log(`   client_description antes:`, product.client_description)
          
          if (prefillResult.has_data && prefillResult.prefill_data) {
            const prefillData = prefillResult.prefill_data
            
            console.log(`✅ Pré-preenchendo produto: ${prefillData.supp_code}`)
            
            // Pré-preencher campos editáveis
            product.client_code = prefillData.cli_code
            product.client_description = prefillData.cli_desc
            
            // Marcar como bloqueado se for produto específico do mesmo estoque
            product.isLocked = prefillData.is_locked
            
            if (prefillData.is_locked) {
              console.log(`🔒 Produto ${prefillData.supp_code} bloqueado para alteração`)
            }
          } else {
            console.log(`❌ Produto não encontrado - aplicando valores padrão`)
            
            // Produto não encontrado - definir valores padrão
            product.isLocked = false
            product.factor = 1
            
            // Produto não encontrado - definir valores padrão como vazio
            product.client_code = ''
            product.client_description = ''
            
            console.log(`   client_code depois:`, product.client_code)
            console.log(`   client_description depois:`, product.client_description)
          }
        })

        // Forçar atualização da interface
        this.forceReactiveUpdate()
        console.log('✅ Pré-preenchimento aplicado e interface atualizada')

      } catch (error) {
        console.error('❌ Erro ao aplicar pré-preenchimento:', error)
        
        // Em caso de erro, definir valores padrão para todos os produtos como vazio
        this.products.forEach(product => {
          product.isLocked = false
          product.factor = 1
          
          // SEMPRE definir valores padrão como vazio em caso de erro
          product.client_code = ''
          product.client_description = ''
        })
        
        // Forçar atualização da interface mesmo em caso de erro
        this.forceReactiveUpdate()
      }
    },

    async checkExistingProductsWithTimeout() {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000) // 10 segundos
      )
      
      try {
        await Promise.race([this.checkExistingProducts(), timeout])
      } catch (error) {
        console.warn('Timeout ou erro ao verificar produtos existentes:', error.message)
        // Define valores padrão em caso de erro
        this.products.forEach(product => {
          if (product.exists === undefined) {
            product.exists = false
            product.factor = 1
          }
        })
      }
    },

    // Método específico para carregar clientes quando o modal é aberto
    async loadClientsForModal() {
      this.loadingClients = true
      try {
        await this.loadAvailableClients()
      } catch (error) {
        console.error('Erro ao carregar clientes para o modal:', error)
        this.showError('Erro ao carregar lista de estoques. Tente novamente.')
      } finally {
        this.loadingClients = false
      }
    },

    async loadAvailableClients() {
      try {
        // Usar o apiClient global com cache
        const apiClient = window.apiClient

        const response = await apiClient.request('/clients', {
          method: 'GET',
        })

        let allClients = response.data || []

        allClients = allClients.filter(client => client.cnpj)

        const currentUser = this.getCurrentUser()
        console.log('DEBUG cli_access:', currentUser?.cli_access)
        console.log('DEBUG lista de clientes recebida:', allClients)
        if (currentUser && currentUser.level_access !== 0) {
          if (currentUser.cli_access) {
            // Normalizar CNPJs para comparação sem máscara
            const allowedCNPJs = Object.keys(currentUser.cli_access).map(cnpj => cnpj.replace(/[^\d]/g, ''))
            allClients = allClients.filter(client => {
              const clientCnpj = (client.cnpj || '').replace(/[^\d]/g, '')
              return allowedCNPJs.includes(clientCnpj)
            })
            console.log('DEBUG allowedCNPJs:', allowedCNPJs)
            console.log('DEBUG lista de clientes após filtro:', allClients)
          } else {
            allClients = []
          }
        }

        this.clients = allClients

        if (this.nfeData.client_cnpj) {
          const normalizedXmlCnpj = this.nfeData.client_cnpj.replace(
            /[^\d]/g,
            ''
          )

          const matchingClient = this.clients.find(client => {
            if (!client.cnpj) {
              return false
            }
            const normalizedClientCnpj = client.cnpj.replace(/[^\d]/g, '')
            return normalizedClientCnpj === normalizedXmlCnpj
          })

          if (matchingClient) {
            this.selectedClient = matchingClient
            console.log(
              'Cliente selecionado automaticamente:',
              matchingClient.name
            )
          } else {
            console.log(
              'Cliente não encontrado na lista para CNPJ:',
              this.nfeData.client_cnpj
            )
          }
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error)
      }
    },

    async loadAvailableClientsWithTimeout() {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 8000) // 8 segundos
      )
      
      try {
        await Promise.race([this.loadAvailableClients(), timeout])
      } catch (error) {
        console.warn('Timeout ou erro ao carregar clientes:', error.message)
        // Em caso de erro, mantém lista vazia e permite seleção manual posteriormente
        if (!this.clients || this.clients.length === 0) {
          console.log('Lista de clientes não carregada - usuário poderá selecionar manualmente')
        }
      }
    },

    async nextStep() {
      if (this.currentStep === 1 && this.canProceedToStep2) {
        this.currentStep = 2
      } else if (this.currentStep === 2 && this.canProceedToStep3) {
        // Mostrar loading de pré-preenchimento
        this.loadingPrefill = true
        
        try {
          // Verificar produtos existentes antes de ir para o step 3
          if (this.products.length > 0 && this.selectedClient) {
            await this.checkExistingProducts()
          }
          
          // Avançar para o step 3
          this.currentStep = 3
        } catch (error) {
          console.error('Erro ao verificar produtos:', error)
          this.showError('Erro ao verificar produtos. Tente novamente.')
        } finally {
          // Esconder loading
          this.loadingPrefill = false
        }
      }
    },

    previousStep() {
      if (this.currentStep > 1) {
        this.currentStep--
      }
    },

    updateProduct(product) {
      const index = this.products.findIndex(p => p.id === product.id)
      if (index !== -1) {
        // Update specific fields to maintain reactivity in Vue 3
        this.products[index] = { ...this.products[index], ...product }
      }
    },

    // Força a atualização da interface após mudanças nos produtos
    forceReactiveUpdate() {
      // Força o Vue a re-renderizar a lista de produtos
      this.products = [...this.products]
    },

    editProduct(product) {
      this.selectedProduct = product
      this.showProductEditModal = true
    },

    closeProductEditModal() {
      this.showProductEditModal = false
      this.selectedProduct = null
    },

    async openClientSelectionModal() {
      this.showClientSelectionModal = true
      
      // Se não há clientes carregados ou lista está vazia, carregar agora
      if (!this.clients || this.clients.length === 0) {
        await this.loadClientsForModal()
      }
    },

    closeClientSelectionModal() {
      this.showClientSelectionModal = false
    },

    async selectClient(client) {
      this.selectedClient = client
      this.closeClientSelectionModal()
    },

    async createSchedule() {
      if (!this.canCreateSchedule) return

      const currentUser = this.getCurrentUser()
      if (!currentUser) {
        this.showError('Usuário não autenticado. Faça login novamente.')
        return
      }

      if (
        currentUser.level_access === undefined ||
        currentUser.level_access < 0
      ) {
        this.showError(
          'Usuário não autenticado. Faça login novamente.'
        )
        return
      }

      this.loading = true
      this.errors = []

      const token = localStorage.getItem('token')
      if (!token) {
        this.showError(
          'Token de autenticação não encontrado. Faça login novamente.'
        )
        this.loading = false
        return
      }

      if (!this.nfeData.nfe_key) {
        this.showError('Chave da NFe é obrigatória.')
        this.loading = false
        return
      }

      if (!this.selectedClient || !this.selectedClient.cnpj) {
        this.showError('Estoque é obrigatório. Selecione um estoque para o agendamento.')
        this.loading = false
        return
      }

      if (!this.nfeData.date) {
        this.showError('Data da NFe é obrigatória.')
        this.loading = false
        return
      }

      const clientCnpj = this.selectedClient.cnpj.replace(/[^\d]/g, '')
      if (clientCnpj.length !== 14) {
        this.showError('CNPJ do estoque selecionado deve ter exatamente 14 dígitos.')
        this.loading = false
        return
      }

      let supplier =
        this.nfeData.supplier_name || this.nfeData.supplier_cnpj || ''
      if (!supplier) {
        this.showError('Dados do fornecedor são obrigatórios.')
        this.loading = false
        return
      }

      if (supplier.length > 50) {
        supplier = supplier.substring(0, 50)
      }

      const nfeNumber = String(this.nfeData.number || '').trim()
      if (!nfeNumber || !/^\d{1,10}$/.test(nfeNumber)) {
        this.showError(
          'Número da NFe deve conter apenas dígitos e ter no máximo 10 caracteres.'
        )
        this.loading = false
        return
      }

      const formattedDate = this.scheduledDate

      if (!formattedDate) {
        this.showError(
          'Por favor, selecione a data desejada para entrega física.'
        )
        this.loading = false
        return
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
        this.showError('Data de entrega deve estar no formato YYYY-MM-DD.')
        this.loading = false
        return
      }

      console.log('Data de agendamento para envio:', formattedDate)

      const scheduleData = {
        number: nfeNumber,
        nfe_key: this.nfeData.nfe_key,
        client: clientCnpj,
        case_count: parseInt(this.nfeData.case_count) || 0,
        date: formattedDate,
        status: 'Solicitado',
        supplier: supplier,
        qt_prod: parseInt(this.nfeData.qt_prod) || this.products.length,
        info: {
          ...this.nfeData,
          products: this.products // Inclui os produtos editados pelo usuário
        },
      }

      console.log('Enviando dados do agendamento:', scheduleData)
      console.log('Token presente:', !!token)

      try {
        // Usar o apiClient global com cache
        const apiClient = window.apiClient

        const response = await apiClient.request('/schedules', {
          method: 'POST',
          data: scheduleData,
        })

        console.log('Agendamento criado com sucesso:', response)
        this.showSuccess('Agendamento criado com sucesso!')
        this.$emit('created', response)

        setTimeout(() => {
          this.closeModal()
        }, 1500)
      } catch (error) {
        console.error('Erro ao criar agendamento:', error)
        console.error('Resposta da API:', error.response?.data)

        if (error.response?.status === 403) {
          this.showError(
            'Acesso negado. Usuário não possui permissão para criar agendamentos.'
          )
        } else if (error.response?.status === 401) {
          this.showError(
            'Token de autenticação inválido. Faça login novamente.'
          )
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = 'login.html'
        } else if (error.response?.status === 400) {
          const errorData = error.response?.data
          let errorMessage =
            errorData?.error || 'Dados inválidos enviados para a API.'

          if (errorData?.details && Array.isArray(errorData.details)) {
            const details = errorData.details
              .map(detail => {
                if (typeof detail === 'string') return detail
                if (detail.message) return detail.message
                if (detail.path)
                  return `Campo ${detail.path}: ${detail.message || 'inválido'}`
                return JSON.stringify(detail)
              })
              .join(', ')
            errorMessage += `. Detalhes: ${details}`
          }

          this.showError('Erro de validação: ' + errorMessage)
          console.error('Dados enviados que causaram erro:', scheduleData)
          console.error('Resposta completa da API:', errorData)
          console.error(
            'Detalhes do erro (expandido):',
            JSON.stringify(errorData.details, null, 2)
          )
        } else {
          this.showError(
            'Erro ao criar agendamento: ' +
              (error.message || 'Erro desconhecido')
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

    async validateClientAccess(clientCNPJ) {
      const currentUser = this.getCurrentUser()

      if (!currentUser) {
        throw new Error('Usuário não autenticado')
      }

      if (currentUser.level_access === 0) {
        return true
      }

      if (currentUser.cli_access && currentUser.cli_access[clientCNPJ]) {
        return true
      }

      throw new Error(
        `Usuário ${currentUser.user} não possui acesso ao cliente com CNPJ ${clientCNPJ}`
      )
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

    formatCurrency(value) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value)
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
.estoque-lista-vertical {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 8px;
}
.estoque-lista-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  transition: background 0.15s;
}
.estoque-lista-item:last-child {
  border-bottom: none;
}
.estoque-lista-item:hover {
  background: #f1f5fa;
}
.estoque-lista-info {
  display: flex;
  align-items: center;
  gap: 16px;
}
.estoque-nome {
  font-weight: 600;
  color: #1e3a8a;
  font-size: 1.05rem;
}
.estoque-cnpj {
  font-family: 'Fira Mono', monospace;
  color: #2563eb;
  font-size: 0.97rem;
}
.estoque-numero {
  color: #666;
  font-size: 0.95rem;
}
.btn-selecionar-estoque {
  margin-left: 16px;
  padding: 4px 16px;
  font-size: 0.97rem;
  border-radius: 6px;
}
.estoque-lista-vazia {
  padding: 18px 0;
  text-align: center;
  color: #888;
}
.estoque-data-container {
  background: #f8fafc;
  border: 2px solid #2563eb22;
  border-radius: 12px;
  padding: 22px 24px 18px 24px;
  margin: 24px 0 0 0;
  box-shadow: 0 2px 8px rgba(30, 58, 138, 0.06);
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.client-selection,
.delivery-date-selection {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.selected-client-info {
  background: #e0e7ef;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  text-align: center;
}
.info-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.info-item label {
  font-weight: 500;
  color: #2563eb;
  margin-right: 4px;
}
.info-item span {
  color: #222;
}
.date-input-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  text-align: center;
}
.mt-3 {
  margin-top: 18px;
}
.btn-alterar-estoque {
  height: 38px;
  min-width: 90px;
  max-width: 140px;
  padding: 0 14px;
  font-size: 0.97rem;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.date-input-container input[type="date"] {
  max-width: 180px;
  min-width: 120px;
  height: 36px;
  font-size: 1rem;
  padding: 2px 8px;
}

/* Estilos para otimizar a tabela de produtos */
.products-table-container {
  width: 100%;
  overflow-x: hidden;
  margin-top: 1rem;
  max-width: 100%;
}

.products-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  table-layout: fixed;
  /* Forçar estrutura consistente da tabela */
  border-spacing: 0;
  /* Reset completo para evitar interferência de CSS externo */
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Reset específico para células da tabela */
.products-table * {
  box-sizing: border-box;
}

.products-table th,
.products-table td {
  border: 1px solid #ddd;
  padding: 8px 6px;
  text-align: left;
  vertical-align: top;
}

.products-table th {
  background-color: #f5f5f5;
  font-weight: 600;
  font-size: 0.8rem;
}

/* Definir larguras específicas para cada coluna */
.products-table th:nth-child(1),
.products-table td:nth-child(1) { width: 12%; min-width: 80px; }  /* Cód. Forn. */

.products-table th:nth-child(2),
.products-table td:nth-child(2) { width: 12%; min-width: 80px; }  /* Cód. Venda */

.products-table th:nth-child(3),
.products-table td:nth-child(3) { width: 25%; min-width: 150px; } /* Descrição Fornecedor */

.products-table th:nth-child(4),
.products-table td:nth-child(4) { width: 20%; min-width: 120px; } /* Descrição Venda */

.products-table th:nth-child(5),
.products-table td:nth-child(5) { width: 8%; min-width: 60px; }  /* Quant. */

.products-table th:nth-child(6),
.products-table td:nth-child(6) { width: 7%; min-width: 50px; }  /* Fator */

.products-table th:nth-child(7),
.products-table td:nth-child(7) { width: 8%; min-width: 70px; }  /* Valor Un. */

.products-table th:nth-child(8),
.products-table td:nth-child(8) { width: 8%; min-width: 70px; }  /* Valor Total */

.products-table th:nth-child(9),
.products-table td:nth-child(9) { width: 10%; min-width: 80px; } /* Código EAN */

/* Estilo para células de descrição expansível */
.description-cell {
  word-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  max-width: 200px;
  line-height: 1.3;
}

/* Inputs menores para economizar espaço */
.products-table .form-control-sm {
  font-size: 0.8rem;
  padding: 2px 4px;
  height: auto;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 3px;
}

/* Ajustar colunas de valores monetários */
.products-table td:nth-child(7),
.products-table td:nth-child(8) {
  text-align: right;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
}

/* Loading state for clients modal */
.loading-clients-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  min-height: 150px;
}

.loading-spinner {
  margin-bottom: 16px;
}

.loading-spinner i {
  font-size: 2rem;
  color: var(--primary, #3b82f6);
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.loading-subtext {
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0;
  font-style: italic;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Improved empty state styling */
.estoque-lista-vazia {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 0;
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
}

.estoque-lista-vazia i {
  color: #9ca3af;
  font-size: 1rem;
}

/* Estilos para campos bloqueados/pré-preenchidos */
.products-table .form-control-sm:disabled,
.products-table .form-control-sm.locked-field {
  background-color: #e8f5e8 !important; /* Verde bem claro */
  border: 2px solid #c3e6c3 !important; /* Verde claro */
  color: #2d5a2d !important; /* Verde escuro */
  cursor: not-allowed !important;
}

.products-table .form-control-sm:disabled:focus,
.products-table .form-control-sm.locked-field:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25) !important; /* Verde com transparência */
}

/* Indicador visual para linha de produto bloqueado */
.products-table tr.product-locked {
  background-color: #f0fff0 !important; /* Verde claro */
  border-left: 4px solid #28a745 !important; /* Verde escuro */
}

/* Ícone de bloqueio para produtos pré-preenchidos */
.product-lock-icon {
  color: #28a745; /* Verde para combinar com o tema */
  font-size: 14px;
  margin-left: 4px;
  title: "Produto já cadastrado - campos bloqueados";
}

/* Tela de carregamento do pré-preenchimento */
.prefill-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  text-align: center;
  min-height: 300px;
  background: linear-gradient(135deg, #f8fdff 0%, #f0fff4 100%);
  border-radius: 12px;
  margin: 20px;
}

.prefill-spinner {
  margin-bottom: 24px;
}

.prefill-spinner i {
  font-size: 3rem;
  color: #28a745;
  animation: prefill-spin 2s linear infinite;
}

.prefill-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #155724;
  margin: 0 0 12px 0;
}

.prefill-message {
  font-size: 1rem;
  color: #6c757d;
  margin: 0 0 24px 0;
  max-width: 400px;
  line-height: 1.5;
}

.prefill-progress {
  margin-bottom: 20px;
}

.prefill-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.prefill-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #28a745;
  animation: prefill-bounce 1.4s ease-in-out infinite both;
}

.prefill-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.prefill-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.prefill-dots span:nth-child(3) {
  animation-delay: 0s;
}

.prefill-help {
  font-size: 0.9rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 6px;
}

.prefill-help i {
  color: #17a2b8;
}

/* Animações */
@keyframes prefill-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes prefill-bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

</style>
