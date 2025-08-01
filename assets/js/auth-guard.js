// Authentication Guard - Protege o dashboard
class AuthGuard {
    constructor() {
        this.apiBaseUrl = 'https://schedule-mercocamp-back-end.up.railway.app/api';
        this.init();
    }

    init() {
        // Executa verificação quando a página carrega
        this.checkAuthentication();
    }

    async checkAuthentication() {
        const token = localStorage.getItem('token');
        
        if (!token) {
            this.redirectToLogin();
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Token válido, usuário pode acessar o dashboard
                this.initializeDashboard();
            } else {
                // Token inválido
                this.handleInvalidToken();
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            this.handleInvalidToken();
        }
    }

    handleInvalidToken() {
        // Remove tokens inválidos
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redireciona para login
        this.redirectToLogin();
    }

    redirectToLogin() {
        // Salva a página atual para redirecionamento após login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Redireciona para login
        window.location.href = 'login.html';
    }

    initializeDashboard() {
        // Carrega informações do usuário
        this.loadUserInfo();
        
        // Configura logout
        this.setupLogout();
        
        // Configura atualização automática de token
        this.setupTokenRefresh();
    }

    loadUserInfo() {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                this.displayUserInfo(user);
            } catch (error) {
                console.error('Erro ao carregar dados do usuário:', error);
            }
        }
    }

    displayUserInfo(user) {
        // Atualiza informações do usuário na interface
        const userNameElements = document.querySelectorAll('.user-name');
        const userRoleElements = document.querySelectorAll('.user-role');
        
        userNameElements.forEach(element => {
            element.textContent = user.name || user.user;
        });
        
        userRoleElements.forEach(element => {
            element.textContent = this.getUserRole(user.level_access);
        });
    }

    getUserRole(levelAccess) {
        switch (levelAccess) {
            case 0:
                return 'Usuário';
            case 1:
                return 'Administrador';
            case 2:
                return 'Gerente';
            default:
                return 'Usuário';
        }
    }

    setupLogout() {
        // Adiciona botão de logout se não existir
        this.createLogoutButton();
        
        // Configura evento de logout
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('logout-btn') || 
                e.target.closest('.logout-btn')) {
                this.handleLogout();
            }
        });
    }

    createLogoutButton() {
        // Verifica se já existe um botão de logout
        if (document.querySelector('.logout-btn')) {
            return;
        }

        // Cria informações do usuário na sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            const userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            userInfo.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                    <div class="user-name">Carregando...</div>
                    <div class="user-role">Usuário</div>
                </div>
                <button class="logout-btn" title="Sair">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;
            
            sidebar.appendChild(userInfo);
        }
    }

    async handleLogout() {
        // Confirma logout
        const confirmLogout = confirm('Tem certeza que deseja sair?');
        if (!confirmLogout) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            
            // Opcional: notificar o servidor sobre logout
            if (token) {
                fetch(`${this.apiBaseUrl}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).catch(error => {
                    console.warn('Erro ao notificar logout:', error);
                });
            }
        } catch (error) {
            console.warn('Erro durante logout:', error);
        } finally {
            // Remove dados do usuário
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('redirectAfterLogin');
            
            // Redireciona para login
            window.location.href = 'login.html';
        }
    }

    setupTokenRefresh() {
        // Configura renovação automática do token
        setInterval(() => {
            this.refreshToken();
        }, 30 * 60 * 1000); // A cada 30 minutos
    }

    async refreshToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                }
            }
        } catch (error) {
            console.warn('Erro ao renovar token:', error);
        }
    }
}

// Classe para requisições autenticadas
class AuthenticatedApiClient {
    constructor() {
        this.baseURL = 'https://schedule-mercocamp-back-end.up.railway.app/api';
    }

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Adiciona token se disponível
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        
        if (response.status === 401) {
            // Token expirado - redireciona para login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro na requisição');
        }
        
        return data;
    }

    // Métodos específicos para as funcionalidades do sistema
    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/users?${queryString}`);
    }

    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/products?${queryString}`);
    }

    async getSchedules(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/schedules?${queryString}`);
    }

    async createSchedule(scheduleData) {
        return this.request('/schedules', {
            method: 'POST',
            body: JSON.stringify(scheduleData)
        });
    }

    async updateScheduleStatus(scheduleId, status, comment) {
        return this.request(`/schedules/${scheduleId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
                status,
                historic_entry: {
                    user: this.getCurrentUser().user,
                    action: `Status alterado para ${status}`,
                    comment
                }
            })
        });
    }

    getCurrentUser() {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (error) {
                console.error('Erro ao obter usuário atual:', error);
                return null;
            }
        }
        return null;
    }
}

// Funções utilitárias globais
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showNotification(message, type = 'info') {
    // Implementar sistema de notificações
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Inicializa o guard de autenticação quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    new AuthGuard();
});

// Exporta classes para uso global
window.AuthGuard = AuthGuard;
window.AuthenticatedApiClient = AuthenticatedApiClient; 