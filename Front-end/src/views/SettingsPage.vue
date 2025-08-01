<template>
  <div class="settings-page">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">
            <i class="fas fa-cog"></i>
            Configurações do Sistema
          </h1>
          <p class="page-description">
            Configure e-mail e notificações do sistema
          </p>
        </div>
      </div>
    </div>

    <!-- Settings Container -->
    <div class="settings-container">

      <!-- Email Settings Section -->
      <div class="settings-card">
        <div class="card-header">
          <div class="header-left">
            <h2 class="section-title">
              <i class="fas fa-envelope"></i>
              Configurações de E-mail
            </h2>
            <p class="section-subtitle">Configure notificações e destinatários de e-mail</p>
          </div>
        </div>

        <div class="email-settings-content">
          <!-- Primary Email -->
          <div class="setting-group">
            <div class="setting-header">
              <h3 class="setting-title">
                <i class="fas fa-at"></i>
                E-mail Principal
              </h3>
              <p class="setting-description">E-mail principal para notificações do sistema</p>
            </div>
            <div class="setting-control">
              <input 
                type="email" 
                v-model="emailSettings.primaryEmail" 
                placeholder="admin@empresa.com"
                class="form-input email-input"
              />
            </div>
          </div>

          <!-- CC Emails -->
          <div class="setting-group">
            <div class="setting-header">
              <h3 class="setting-title">
                <i class="fas fa-copy"></i>
                E-mails para Cópia (CC)
              </h3>
              <p class="setting-description">Adicione e-mails que devem receber cópia das notificações</p>
            </div>
            
            <!-- Add Email Controls -->
            <div class="add-email-section">
              <div class="add-email-controls">
                <input 
                  type="email" 
                  v-model="newCcEmail"
                  placeholder="novo.email@empresa.com"
                  class="form-input add-email-input"
                  @keyup.enter="addCcEmail"
                />
                <button 
                  type="button"
                  @click="addCcEmail"
                  class="btn btn-primary"
                  :disabled="!newCcEmail.trim()"
                >
                  <i class="fas fa-plus"></i>
                  Adicionar
                </button>
              </div>
            </div>

            <!-- CC Emails List -->
            <div v-if="emailSettings.ccEmails.length" class="cc-emails-list">
              <div 
                v-for="(email, index) in emailSettings.ccEmails" 
                :key="index"
                class="cc-email-item"
              >
                <div class="email-info">
                  <i class="fas fa-envelope"></i>
                  <span class="email-address">{{ email }}</span>
                </div>
                <button 
                  type="button"
                  @click="removeCcEmail(index)"
                  class="btn btn-sm btn-outline-danger"
                  title="Remover e-mail"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Status Notifications -->
          <div class="setting-group">
            <div class="setting-header">
              <h3 class="setting-title">
                <i class="fas fa-list-check"></i>
                Notificações por Status
              </h3>
                             <p class="setting-description">Configure quais mudanças de status devem gerar e-mails com a notificação</p>
            </div>

            <!-- Master Toggle -->
            <div class="master-toggle-section">
              <label class="toggle-switch master-toggle">
                <input 
                  type="checkbox" 
                  :checked="allStatusNotificationsEnabled"
                  @change="toggleAllStatusNotifications"
                >
                <span class="toggle-slider"></span>
                <span class="toggle-label">Ativar Todos os Status</span>
              </label>
            </div>

            <!-- Status List -->
            <div class="status-notifications-grid">
              <div 
                v-for="status in statusList" 
                :key="status.key" 
                class="status-notification-item"
              >
                <div class="status-info">
                  <div class="status-indicator" :class="status.class"></div>
                  <div class="status-details">
                    <h4 class="status-name">{{ status.label }}</h4>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input 
                    type="checkbox" 
                    v-model="emailSettings.statusNotifications[status.key]"
                  >
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Email Actions -->
          <div class="email-actions">
            <button 
              @click="testEmailSettings" 
              class="btn btn-outline-primary"
              :disabled="!emailSettings.primaryEmail"
            >
              <i class="fas fa-paper-plane"></i>
              Testar E-mail
            </button>
            <button 
              @click="saveEmailSettings" 
              class="btn btn-success"
              :disabled="savingEmailSettings"
            >
              <i class="fas fa-save"></i>
              {{ savingEmailSettings ? 'Salvando...' : 'Salvar Configurações' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Password Change Section -->
      <div class="settings-card">
        <div class="card-header">
          <div class="header-left">
            <h2 class="section-title">
              <i class="fas fa-key"></i>
              Alteração de Senha
            </h2>
            <p class="section-subtitle">Altere sua senha de acesso ao sistema</p>
          </div>
        </div>

        <div class="password-settings-content">
          <!-- Current Password -->
          <div class="setting-group">
            <div class="setting-header">
              <h3 class="setting-title">
                <i class="fas fa-lock"></i>
                Senha Atual
              </h3>
              <p class="setting-description">Digite sua senha atual para confirmar a alteração</p>
            </div>
            <div class="setting-control">
              <input 
                type="password" 
                v-model="passwordForm.currentPassword" 
                placeholder="Digite sua senha atual"
                class="form-input password-input"
                :class="{ 'input-error': passwordErrors.currentPassword }"
              />
              <div v-if="passwordErrors.currentPassword" class="error-message">
                {{ passwordErrors.currentPassword }}
              </div>
            </div>
          </div>

          <!-- New Password -->
          <div class="setting-group">
            <div class="setting-header">
              <h3 class="setting-title">
                <i class="fas fa-key"></i>
                Nova Senha
              </h3>
              <p class="setting-description">Digite a nova senha (mínimo 6 caracteres)</p>
            </div>
            <div class="setting-control">
              <input 
                type="password" 
                v-model="passwordForm.newPassword" 
                placeholder="Digite a nova senha"
                class="form-input password-input"
                :class="{ 'input-error': passwordErrors.newPassword }"
              />
              <div v-if="passwordErrors.newPassword" class="error-message">
                {{ passwordErrors.newPassword }}
              </div>
            </div>
          </div>

          <!-- Confirm New Password -->
          <div class="setting-group">
            <div class="setting-header">
              <h3 class="setting-title">
                <i class="fas fa-check-circle"></i>
                Confirmar Nova Senha
              </h3>
              <p class="setting-description">Digite novamente a nova senha para confirmar</p>
            </div>
            <div class="setting-control">
              <input 
                type="password" 
                v-model="passwordForm.confirmPassword" 
                placeholder="Confirme a nova senha"
                class="form-input password-input"
                :class="{ 'input-error': passwordErrors.confirmPassword }"
              />
              <div v-if="passwordErrors.confirmPassword" class="error-message">
                {{ passwordErrors.confirmPassword }}
              </div>
            </div>
          </div>

          <!-- Password Actions -->
          <div class="password-actions">
            <button 
              @click="resetPasswordForm" 
              class="btn btn-outline-secondary"
              :disabled="changingPassword"
            >
              <i class="fas fa-times"></i>
              Cancelar
            </button>
            <button 
              @click="changePassword" 
              class="btn btn-primary"
              :disabled="changingPassword || !isPasswordFormValid"
            >
              <i class="fas fa-save"></i>
              {{ changingPassword ? 'Alterando...' : 'Alterar Senha' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Importar VueApiClient do App.vue
const VueApiClient = window.VueApiClient || class {
  constructor() {
    this.baseURL = 'http://localhost:4000/api'
  }
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token')
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${this.baseURL}${endpoint}`, config)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response.json()
  }
  async getUserSettings() { return this.request('/user-settings') }
  async updateEmailSettings(emailSettings) { 
    return this.request('/user-settings/email', { method: 'PATCH', body: JSON.stringify({ emailSettings }) }) 
  }
  async testEmailSettings() { return this.request('/user-settings/test-email', { method: 'POST' }) }
  // Método para testar e-mail usando as novas rotas
  async testEmailDirect(recipients) {
    return this.request('/email-test/simple', { 
      method: 'POST', 
      body: JSON.stringify({ recipients }) 
    })
  }
  // Método para atualizar perfil do usuário
  async updateProfile(profileData) {
    return this.request('/users/profile/me', { 
      method: 'PUT', 
      body: JSON.stringify(profileData) 
    })
  }
}

export default {
  name: 'SettingsPage',
  data() {
    return {
      loadingSettings: false,
      emailSettings: {
        primaryEmail: '',
        ccEmails: [],
        statusNotifications: {
          solicitado: true,
          contestado: true,
          agendado: true,
          conferencia: true,
          tratativa: true,
          estoque: true,
          recusado: true,
          cancelado: true
        }
      },
      newCcEmail: '',
      savingEmailSettings: false,
      // Campos para alteração de senha
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      passwordErrors: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      changingPassword: false,
      statusList: [
        {
          key: 'solicitado',
          label: 'Solicitado',
          class: 'status-warning'
        },
        {
          key: 'contestado',
          label: 'Contestado',
          class: 'status-contestado'
        },
        {
          key: 'agendado',
          label: 'Agendado',
          class: 'status-primary'
        },
        {
          key: 'conferencia',
          label: 'Conferência',
          class: 'status-success'
        },
        {
          key: 'tratativa',
          label: 'Tratativa',
          class: 'status-danger'
        },
        {
          key: 'estoque',
          label: 'Estoque',
          class: 'status-success'
        },
        {
          key: 'recusado',
          label: 'Recusado',
          class: 'status-dark'
        },
        {
          key: 'cancelado',
          label: 'Cancelado',
          class: 'status-secondary'
        }
      ]
    };
  },
  
  async mounted() {
    await this.loadUserSettings()
  },
  
  computed: {
    allStatusNotificationsEnabled() {
      return Object.values(this.emailSettings.statusNotifications).every(enabled => enabled)
    },

    isPasswordFormValid() {
      return this.passwordForm.currentPassword.trim() &&
             this.passwordForm.newPassword.trim() &&
             this.passwordForm.confirmPassword.trim() &&
             this.passwordForm.newPassword.length >= 6 &&
             this.passwordForm.newPassword === this.passwordForm.confirmPassword &&
             !this.passwordErrors.currentPassword &&
             !this.passwordErrors.newPassword &&
             !this.passwordErrors.confirmPassword
    }
  },
  methods: {
    async loadUserSettings() {
      this.loadingSettings = true
      try {
        // Usar o apiClient global com cache
        const apiClient = window.apiClient
        const response = await apiClient.getUserSettings()
        
        if (response.settings) {
          // Atualizar configurações com dados do servidor
          this.emailSettings = {
            ...this.emailSettings,
            ...response.settings.emailSettings
          }
        }
        
        console.log('Configurações carregadas:', response.settings)
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
        this.$emit('notification', 'Erro ao carregar configurações', 'error')
      } finally {
        this.loadingSettings = false
      }
    },

    async testEmailSettings() {
      if (!this.emailSettings.primaryEmail) {
        this.$emit('notification', 'E-mail principal é obrigatório para testar', 'warning')
        return
      }

      try {
        console.log('📧 Testando e-mail...')
        console.log('   E-mail principal:', this.emailSettings.primaryEmail)
        console.log('   E-mails CC:', this.emailSettings.ccEmails)

        // Preparar lista de destinatários (principal + CC)
        const recipients = [this.emailSettings.primaryEmail]
        if (this.emailSettings.ccEmails && this.emailSettings.ccEmails.length > 0) {
          recipients.push(...this.emailSettings.ccEmails)
        }

        console.log('   Enviando para:', recipients.join(', '))

        // Usar o apiClient global com cache
        const apiClient = window.apiClient
        const response = await apiClient.testEmailDirect(recipients)
        
        console.log('✅ Resposta do teste:', response)
        
        if (response.skipped) {
          this.$emit('notification', 
            'Teste de e-mail pulado - configure um e-mail principal para testar', 
            'info'
          )
        } else {
          this.$emit('notification', 
            `E-mail de teste enviado com sucesso para: ${response.recipients.join(', ')}`, 
            'success'
          )
        }
      } catch (error) {
        console.error('❌ Erro ao testar e-mail:', error)
        this.$emit('notification', 
          'Erro ao testar e-mail: ' + (error.message || 'Erro desconhecido'), 
          'error'
        )
      }
    },
    
    addCcEmail() {
      if (this.newCcEmail.trim() && !this.emailSettings.ccEmails.includes(this.newCcEmail.trim())) {
        this.emailSettings.ccEmails.push(this.newCcEmail.trim())
        this.newCcEmail = ''
        this.$emit('notification', 'E-mail CC adicionado!', 'success')
      } else if (this.emailSettings.ccEmails.includes(this.newCcEmail.trim())) {
        this.$emit('notification', 'Este e-mail já está na lista', 'warning')
      }
    },
    
    removeCcEmail(index) {
      this.emailSettings.ccEmails.splice(index, 1)
      this.$emit('notification', 'E-mail CC removido!', 'success')
    },
    
    async saveEmailSettings() {
      this.savingEmailSettings = true
      try {
        this.$emit('notification', 'Salvando configurações de e-mail...', 'info')
        
        // Usar o apiClient global com cache
        const apiClient = window.apiClient
        const response = await apiClient.updateEmailSettings(this.emailSettings)
        
        this.$emit('notification', response.message || 'Configurações de e-mail salvas com sucesso!', 'success')
      } catch (error) {
        console.error('Erro ao salvar configurações:', error)
        this.$emit('notification', error.response?.data?.error || 'Erro ao salvar configurações', 'error')
      } finally {
        this.savingEmailSettings = false
      }
    },
    
    toggleAllStatusNotifications(event) {
      const isEnabled = event.target.checked
      Object.keys(this.emailSettings.statusNotifications).forEach(key => {
        this.emailSettings.statusNotifications[key] = isEnabled
      })
    },

    // Métodos para alteração de senha
    validatePasswordForm() {
      this.passwordErrors = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }

      // Validar senha atual
      if (!this.passwordForm.currentPassword.trim()) {
        this.passwordErrors.currentPassword = 'Senha atual é obrigatória'
      }

      // Validar nova senha
      if (!this.passwordForm.newPassword.trim()) {
        this.passwordErrors.newPassword = 'Nova senha é obrigatória'
      } else if (this.passwordForm.newPassword.length < 6) {
        this.passwordErrors.newPassword = 'Nova senha deve ter pelo menos 6 caracteres'
      }

      // Validar confirmação de senha
      if (!this.passwordForm.confirmPassword.trim()) {
        this.passwordErrors.confirmPassword = 'Confirmação de senha é obrigatória'
      } else if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
        this.passwordErrors.confirmPassword = 'Senhas não coincidem'
      }

      return !Object.values(this.passwordErrors).some(error => error)
    },

    async changePassword() {
      if (!this.validatePasswordForm()) {
        return
      }

      this.changingPassword = true
      try {
        this.$emit('notification', 'Alterando senha...', 'info')
        
        // Usar o apiClient global
        const apiClient = window.apiClient
        const response = await apiClient.updateProfile({
          password: this.passwordForm.newPassword,
          currentPassword: this.passwordForm.currentPassword
        })
        
        this.$emit('notification', 'Senha alterada com sucesso!', 'success')
        this.resetPasswordForm()
      } catch (error) {
        console.error('Erro ao alterar senha:', error)
        let errorMessage = 'Erro ao alterar senha'
        
        // Tentar extrair mensagem de erro da resposta
        if (error.message && error.message.includes('401')) {
          errorMessage = 'Senha atual incorreta'
          this.passwordErrors.currentPassword = 'Senha atual incorreta'
        } else if (error.message && error.message.includes('400')) {
          errorMessage = 'Dados inválidos'
        } else {
          errorMessage = error.message || 'Erro desconhecido'
        }
        
        this.$emit('notification', errorMessage, 'error')
      } finally {
        this.changingPassword = false
      }
    },

    resetPasswordForm() {
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      this.passwordErrors = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      this.$emit('notification', 'Formulário de senha limpo', 'info')
    }
  }
};
</script>

<style scoped>
/* Settings Page Layout */
.settings-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 24px;
}

/* Page Header */
.page-header {
  margin-bottom: 32px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title i {
  color: var(--primary);
  font-size: 2.25rem;
}

.page-description {
  font-size: 1.125rem;
  color: var(--gray-600);
  margin: 0;
  max-width: 600px;
}

/* Settings Container */
.settings-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Settings Card */
.settings-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  border: 1px solid var(--gray-200);
}

.card-header {
  padding: 24px 32px;
  background: linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  flex: 1;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title i {
  font-size: 1.25rem;
}

.section-subtitle {
  font-size: 0.95rem;
  margin: 0;
  opacity: 0.9;
}

.header-actions .btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
}

.header-actions .btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.4);
}


/* Form Input Styles (needed for email settings) */
.form-input {
  padding: 12px 16px;
  border: 2px solid var(--gray-300);
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Email Settings */
.email-settings-content {
  padding: 32px;
}

.setting-group {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--gray-200);
}

.setting-group:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.setting-header {
  margin-bottom: 16px;
}

.setting-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gray-900);
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-title i {
  color: var(--primary);
  width: 20px;
}

.setting-description {
  font-size: 0.9rem;
  color: var(--gray-600);
  margin: 0;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.email-input {
  max-width: 400px;
}

/* Add Email Section */
.add-email-section {
  margin-bottom: 16px;
}

.add-email-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  max-width: 500px;
}

.add-email-input {
  flex: 1;
  min-width: 250px;
}

/* CC Emails List */
.cc-emails-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cc-email-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
}

.email-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.email-info i {
  color: var(--primary);
  font-size: 0.9rem;
}

.email-address {
  font-size: 0.9rem;
  color: var(--gray-700);
  font-weight: 500;
}

/* Master Toggle Section */
.master-toggle-section {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--gray-50);
  border-radius: 8px;
  border: 1px solid var(--gray-200);
}

/* Status Notifications Grid */
.status-notifications-grid {
  display: grid;
  gap: 12px;
}

.status-notification-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--gray-50);
  border-radius: 8px;
  border: 1px solid var(--gray-200);
  transition: all 0.2s ease;
}

.status-notification-item:hover {
  background: var(--gray-100);
  border-color: var(--gray-300);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.status-warning {
  background-color: var(--warning);
}

.status-indicator.status-contestado {
  background-color: #8B1538;
}

.status-indicator.status-primary {
  background-color: var(--primary);
}

.status-indicator.status-success {
  background-color: var(--success);
}

.status-indicator.status-danger {
  background-color: var(--danger);
}

.status-indicator.status-dark {
  background-color: #374151;
}

.status-indicator.status-secondary {
  background-color: #6b7280;
}

.status-details {
  flex: 1;
}

.status-name {
  margin: 0;
  font-weight: 600;
  color: var(--gray-800);
  font-size: 0.95rem;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: #cbd5e1;
  border-radius: 24px;
  transition: all 0.3s ease;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--primary);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--gray-700);
}

.master-toggle .toggle-label {
  font-weight: 600;
  color: var(--gray-800);
}

/* Email Actions */
.email-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--gray-200);
}

/* Password Settings Styles */
.password-settings-content {
  padding: 24px 30px;
}

.password-input {
  width: 100%;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

.password-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--gray-200);
}

.input-error {
  border-color: var(--danger) !important;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
}

.error-message {
  color: var(--danger);
  font-size: 0.875rem;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.error-message::before {
  content: "⚠️";
  font-size: 0.75rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .page-title i {
    font-size: 1.75rem;
  }
  
  .card-header {
    padding: 20px 24px;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .email-settings-content {
    padding: 24px 20px;
  }
  
  .add-email-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .email-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.75rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .page-title i {
    font-size: 1.5rem;
  }
  
  .card-header {
    padding: 16px 20px;
  }
  
  .email-settings-content {
    padding: 20px 16px;
  }
}
</style>