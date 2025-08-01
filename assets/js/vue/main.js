// Vue.js Application - Main App
const { createApp } = Vue;

// API Client para Vue.js
class VueApiClient {
    constructor() {
        this.baseURL = 'https://schedule-mercocamp-back-end.up.railway.app/api';
        this.token = localStorage.getItem('token');
    }

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        const config = {
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await axios({
                ...config,
                url: endpoint
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 401) {
                // Token expirado - redirecionar para login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
                return;
            }
            throw error;
        }
    }

    // Métodos específicos da API
    async getDashboardStats() {
        // Simular dados de estatísticas (você pode substituir por endpoint real)
        return {
            pendingDeliveries: 7,
            processing: 23,
            completedToday: 156,
            divergences: 2
        };
    }

    async getRecentActivities() {
        return [
            {
                id: 1,
                type: 'received',
                title: 'Produto Recebido',
                description: 'Smartphone Samsung Galaxy - Código: 4587956321',
                time: '15 minutos atrás',
                status: 'success'
            },
            {
                id: 2,
                type: 'pending',
                title: 'Aguardando Conferência',
                description: 'Lote de Notebooks Dell - Pedido: PED-789654',
                time: '1 hora atrás',
                status: 'warning'
            },
            {
                id: 3,
                type: 'divergence',
                title: 'Divergência Detectada',
                description: 'Diferença na quantidade - Produto: MON-4578123',
                time: '2 horas atrás',
                status: 'danger'
            }
        ];
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
                status: 'scheduled'
            },
            {
                id: 2,
                nfe: '35240414200166000182550010000134152234567890',
                supplier: 'SmartPhone Inc',
                volumes: '8 volumes',
                scheduledDate: '14/07/2025',
                warehouse: 'Estoque Eletrônicos',
                status: 'on_way'
            },
            {
                id: 3,
                nfe: '35240414200166000182550010000134153345678901',
                supplier: 'Office Solutions',
                volumes: '20 volumes',
                scheduledDate: '15/07/2025',
                warehouse: 'Estoque Periféricos',
                status: 'scheduled'
            },
            {
                id: 4,
                nfe: '35240414200166000182550010000134154456789012',
                supplier: 'Industrial Corp',
                volumes: '5 volumes',
                scheduledDate: '15/07/2025',
                warehouse: 'Estoque Industrial',
                status: 'processing'
            }
        ];
    }

    async getSchedules(params = {}) {
        return this.request('/schedules', { params });
    }

    async createSchedule(data) {
        return this.request('/schedules', {
            method: 'POST',
            data
        });
    }

    async updateScheduleStatus(id, status, comment) {
        return this.request(`/schedules/${id}/status`, {
            method: 'PATCH',
            data: {
                status,
                historic_entry: {
                    user: this.getCurrentUser()?.user || 'system',
                    action: `Status alterado para ${status}`,
                    comment
                }
            }
        });
    }

    getCurrentUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }
}

// Instância global do cliente API
const apiClient = new VueApiClient();

// Aplicação Vue.js Principal
const app = createApp({
    data() {
        return {
            // Estado geral
            loading: true,
            user: null,
            activeMenu: 'dashboard',
            
            // Estado do dashboard
            dashboardStats: {
                pendingDeliveries: 0,
                processing: 0,
                completedToday: 0,
                divergences: 0
            },
            statsLoading: false,
            
            // Atividades recentes
            recentActivities: [],
            activitiesLoading: false,
            
            // Entregas pendentes
            pendingDeliveries: [],
            deliveriesLoading: false,
            
            // Notificações
            notifications: []
        };
    },
    
    async mounted() {
        try {
            // Verificar autenticação
            await this.checkAuth();
            
            // Carregar dados do dashboard
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('Erro ao inicializar dashboard:', error);
            this.addNotification('Erro ao carregar dados do dashboard', 'error');
        } finally {
            this.loading = false;
        }
    },
    
    methods: {
        async checkAuth() {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');
            
            if (!token || !userData) {
                window.location.href = 'login.html';
                return;
            }
            
            try {
                this.user = JSON.parse(userData);
            } catch (error) {
                console.error('Erro ao parsear dados do usuário:', error);
                window.location.href = 'login.html';
            }
        },
        
        async loadDashboardData() {
            // Carregar dados em paralelo
            const promises = [
                this.loadStats(),
                this.loadRecentActivities(),
                this.loadPendingDeliveries()
            ];
            
            await Promise.all(promises);
        },
        
        async loadStats() {
            this.statsLoading = true;
            try {
                this.dashboardStats = await apiClient.getDashboardStats();
            } catch (error) {
                console.error('Erro ao carregar estatísticas:', error);
                this.addNotification('Erro ao carregar estatísticas', 'error');
            } finally {
                this.statsLoading = false;
            }
        },
        
        async loadRecentActivities() {
            this.activitiesLoading = true;
            try {
                this.recentActivities = await apiClient.getRecentActivities();
            } catch (error) {
                console.error('Erro ao carregar atividades:', error);
                this.addNotification('Erro ao carregar atividades recentes', 'error');
            } finally {
                this.activitiesLoading = false;
            }
        },
        
        async loadPendingDeliveries() {
            this.deliveriesLoading = true;
            try {
                this.pendingDeliveries = await apiClient.getPendingDeliveries();
            } catch (error) {
                console.error('Erro ao carregar entregas:', error);
                this.addNotification('Erro ao carregar entregas agendadas', 'error');
            } finally {
                this.deliveriesLoading = false;
            }
        },
        
        handleMenuClick(menuId) {
            this.activeMenu = menuId;
            console.log('Menu clicado:', menuId);
            
            // Implementar navegação específica para cada menu
            switch (menuId) {
                case 'dashboard':
                    // Página principal - recarregar dados do dashboard
                    this.loadDashboardData();
                    break;
                case 'agendamento':
                    // Mostrar modal ou página de agendamento
                    this.showScheduleModal();
                    break;
                case 'configuracoes':
                    // Mostrar página de configurações
                    this.showSettingsPage();
                    break;
                default:
                    console.log('Menu não implementado:', menuId);
            }
        },
        
        showScheduleModal() {
            this.addNotification('Funcionalidade de agendamento em desenvolvimento', 'info');
            // TODO: Implementar modal de agendamento
            console.log('Abrindo modal de agendamento...');
        },
        
        showSettingsPage() {
            this.addNotification('Página de configurações em desenvolvimento', 'info');
            // TODO: Implementar página de configurações
            console.log('Abrindo página de configurações...');
        },
        
        handleLogout() {
            const confirmed = confirm('Tem certeza que deseja sair?');
            if (confirmed) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            }
        },
        

        

        
        async handleDeliveryAction(action, deliveryId) {
            console.log('Ação na entrega:', action, deliveryId);
            
            switch(action) {
                case 'start':
                    try {
                        // Atualizar status para processando
                        await apiClient.updateScheduleStatus(deliveryId, 'processing', 'Recebimento iniciado');
                        this.addNotification('Recebimento iniciado', 'success');
                        await this.loadPendingDeliveries(); // Recarregar dados
                    } catch (error) {
                        this.addNotification('Erro ao iniciar recebimento', 'error');
                    }
                    break;
                case 'track':
                    this.addNotification('Abrindo rastreamento...', 'info');
                    break;
                case 'view':
                    this.addNotification('Abrindo detalhes...', 'info');
                    break;
                default:
                    this.addNotification('Ação não reconhecida', 'warning');
            }
        },
        
        addNotification(message, type = 'info') {
            const notification = {
                id: Date.now(),
                message,
                type,
                timestamp: new Date()
            };
            
            this.notifications.push(notification);
            
            // Auto-remove após 5 segundos
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, 5000);
        },
        
        removeNotification(id) {
            const index = this.notifications.findIndex(n => n.id === id);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        },
        
        // Método para recarregar dados
        async refresh() {
            this.loading = true;
            try {
                await this.loadDashboardData();
                this.addNotification('Dados atualizados com sucesso', 'success');
            } catch (error) {
                this.addNotification('Erro ao atualizar dados', 'error');
            } finally {
                this.loading = false;
            }
        }
    }
});

// Registrar componentes globalmente
app.component('sidebar-component', SidebarComponent);
app.component('stats-cards', StatsCards);
app.component('recent-activities', RecentActivities);
app.component('pending-deliveries', PendingDeliveries);
app.component('notifications', NotificationsComponent);

// Montar a aplicação
app.mount('#app');

// Disponibilizar globalmente
window.VueApp = app;
window.apiClient = apiClient; 