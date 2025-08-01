// Login functionality
class LoginManager {
    constructor() {
        this.apiBaseUrl = 'https://schedule-mercocamp-back-end.up.railway.app/api';
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkStoredCredentials();
    }

    bindEvents() {
        const loginForm = document.getElementById('loginForm');
        const togglePassword = document.getElementById('togglePassword');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        // Form submission
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Toggle password visibility
        togglePassword.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });

        // Input validation on keyup
        usernameInput.addEventListener('keyup', () => {
            this.validateField(usernameInput, 'username');
        });

        passwordInput.addEventListener('keyup', () => {
            this.validateField(passwordInput, 'password');
        });

        // Enter key submission
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') passwordInput.focus();
        });

        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Close modal on overlay click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeErrorModal();
            }
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeErrorModal();
            }
        });
    }

    checkStoredCredentials() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        const token = localStorage.getItem('token');

        if (rememberedUser) {
            document.getElementById('username').value = rememberedUser;
            document.getElementById('rememberMe').checked = true;
        }

        // Check if user is already logged in
        if (token) {
            this.verifyToken(token);
        }
    }

    async verifyToken(token) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Token is valid, redirect to dashboard
                window.location.href = 'index.html';
            } else {
                // Token is invalid, remove it
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.querySelector('#togglePassword i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    }

    validateField(input, fieldType) {
        const value = input.value.trim();
        const formGroup = input.closest('.form-group');

        // Remove previous states
        formGroup.classList.remove('error', 'success');

        if (value === '') {
            return false;
        }

        // Basic validation
        let isValid = true;
        if (fieldType === 'username' && value.length < 3) {
            isValid = false;
        }
        if (fieldType === 'password' && value.length < 3) {
            isValid = false;
        }

        // Add visual feedback
        if (isValid) {
            formGroup.classList.add('success');
        } else {
            formGroup.classList.add('error');
        }

        return isValid;
    }

    setLoading(isLoading) {
        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn.querySelector('.btn-text');
        const spinner = loginBtn.querySelector('.loading-spinner');
        const loginForm = document.getElementById('loginForm');

        if (isLoading) {
            loginBtn.disabled = true;
            btnText.textContent = 'Entrando...';
            spinner.style.display = 'inline-block';
            loginForm.classList.add('form-loading');
        } else {
            loginBtn.disabled = false;
            btnText.textContent = 'Entrar';
            spinner.style.display = 'none';
            loginForm.classList.remove('form-loading');
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const rememberMe = document.getElementById('rememberMe').checked;

        // Validate inputs
        if (!username || !password) {
            this.showError('Por favor, preencha todos os campos.');
            return;
        }

        if (username.length < 3) {
            this.showError('O nome de usuário deve ter pelo menos 3 caracteres.');
            return;
        }

        if (password.length < 3) {
            this.showError('A senha deve ter pelo menos 3 caracteres.');
            return;
        }

        this.setLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user: username,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Login successful
                this.handleLoginSuccess(data, rememberMe);
            } else {
                // Login failed
                this.handleLoginError(data);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Erro de conexão. Verifique sua conexão com a internet e tente novamente.');
        } finally {
            this.setLoading(false);
        }
    }

    handleLoginSuccess(data, rememberMe) {
        // Store user data and token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Handle remember me
        if (rememberMe) {
            localStorage.setItem('rememberedUser', data.user.user);
        } else {
            localStorage.removeItem('rememberedUser');
        }

        // Show success animation
        this.showSuccessAndRedirect(data.user);
    }

    handleLoginError(data) {
        let errorMessage = 'Erro ao fazer login. Tente novamente.';

        if (data.error) {
            errorMessage = data.error;
        } else if (data.message) {
            errorMessage = data.message;
        }

        this.showError(errorMessage);
    }

    showSuccessAndRedirect(user) {
        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn.querySelector('.btn-text');
        const spinner = loginBtn.querySelector('.loading-spinner');

        // Update button to show success
        btnText.textContent = 'Login realizado com sucesso!';
        spinner.style.display = 'none';
        loginBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

        // Add success animation
        loginBtn.innerHTML = `
            <i class="fas fa-check"></i>
            <span>Bem-vindo, ${user.name}!</span>
        `;

        // Redirect after short delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }

    showError(message) {
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');

        errorMessage.textContent = message;
        errorModal.style.display = 'flex';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.closeErrorModal();
        }, 5000);
    }

    closeErrorModal() {
        const errorModal = document.getElementById('errorModal');
        errorModal.style.display = 'none';
    }
}

// Utility functions for API requests
class ApiClient {
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

        // Add token if available
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        
        if (response.status === 401) {
            // Token expired - redirect to login
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
}

// Global functions for modal
function closeErrorModal() {
    const errorModal = document.getElementById('errorModal');
    errorModal.style.display = 'none';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});

// Export for potential use in other files
window.LoginManager = LoginManager;
window.ApiClient = ApiClient; 