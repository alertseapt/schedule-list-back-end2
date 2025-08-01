# 📚 API Documentation for Frontend Integration

Documentação completa para integração com a API REST de gerenciamento de agendamentos.

## 📋 Base URL

```
https://schedule-mercocamp-back-end.up.railway.app/api
```

## ⚙️ Configuração Inicial

Para executar a API localmente:

1. **Clone o projeto e instale dependências**
```bash
npm install
```

2. **Configure o arquivo .env**
```bash
cp config.example.env .env
```

3. **Configure suas credenciais no .env**
```env
JWT_SECRET=sua_chave_secreta_forte
DB_HOST=seu_host_mysql
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

4. **Inicie o servidor**
```bash
npm start
```

## 🔐 Autenticação

Todas as rotas (exceto login) requerem autenticação JWT no header:

```javascript
{
  "Authorization": "Bearer <seu_token_jwt>"
}
```

**⏰ Expiração do Token:** Os tokens JWT expiram em 7 dias por padrão.

## 🚀 Endpoints

### **1. Autenticação**

#### **Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "user": "nome_usuario",
  "password": "senha_usuario"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "user": "nome_usuario",
    "name": "Nome Completo",
    "email": "email@example.com",
    "level_access": 1
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### **Verificar Token**
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

#### **Renovar Token**
```http
POST /api/auth/refresh
Authorization: Bearer <token>
```

#### **Registrar Usuário** (Admin apenas)
```http
POST /api/auth/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "user": "novo_usuario",
  "password": "senha123",
  "name": "Nome Completo",
  "email": "email@example.com",
  "level_access": 0,
  "cli_access": {},
  "created_by": "admin_user"
}
```

### **2. Usuários**

#### **Listar Usuários** (Admin)
```http
GET /api/users?page=1&limit=10&search=&level_access=&sort_by=created_at&sort_order=desc
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "users": [
    {
      "id": 1,
      "user": "nome_usuario",
      "name": "Nome Completo",
      "email": "email@example.com",
      "level_access": 1,
      "created_by": "admin",
      "created_at": "2024-01-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

#### **Buscar Usuário por ID**
```http
GET /api/users/1
Authorization: Bearer <token>
```

#### **Atualizar Usuário** (Admin)
```http
PUT /api/users/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Novo Nome",
  "email": "novoemail@example.com",
  "level_access": 1
}
```

#### **Atualizar Próprio Perfil**
```http
PUT /api/users/profile/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Meu Novo Nome",
  "email": "meuemail@example.com",
  "password": "nova_senha"
}
```

#### **Deletar Usuário** (Manager)
```http
DELETE /api/users/1
Authorization: Bearer <token>
```

### **3. Produtos/Relacionamentos**

#### **Listar Produtos**
```http
GET /api/products?page=1&limit=10&cli_cnpj=&supp_cnpj=&user_filter=&search=
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "products": [
    {
      "cli_code": "CLI001",
      "cli_cnpj": "12345678000100",
      "cli_desc": "Cliente Exemplo Ltda",
      "supp_code": "SUPP001",
      "supp_cnpj": "98765432000100",
      "supp_desc": "Fornecedor Exemplo Ltda",
      "user": "usuario_responsavel",
      "date": "2024-01-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "pages": 2
  }
}
```

#### **Buscar Produtos por Cliente**
```http
GET /api/products/client/12345678000100
Authorization: Bearer <token>
```

#### **Buscar Produtos por Fornecedor**
```http
GET /api/products/supplier/98765432000100
Authorization: Bearer <token>
```

#### **Criar Relacionamento Produto**
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "cli_code": "CLI001",
  "cli_cnpj": "12345678000100",
  "cli_desc": "Cliente Exemplo Ltda",
  "supp_code": "SUPP001",
  "supp_cnpj": "98765432000100",
  "supp_desc": "Fornecedor Exemplo Ltda",
  "user": "usuario_responsavel"
}
```

#### **Atualizar Produto** (Admin)
```http
PUT /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "cli_code": "CLI001",
  "cli_cnpj": "12345678000100",
  "cli_desc": "Cliente Atualizado",
  "supp_desc": "Fornecedor Atualizado"
}
```

#### **Deletar Produto** (Admin)
```http
DELETE /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "cli_code": "CLI001",
  "cli_cnpj": "12345678000100"
}
```

### **4. Agendamentos**

#### **Listar Agendamentos**
```http
GET /api/schedules?page=1&limit=10&client=&status=&date_from=&date_to=&nfe_key=&number=
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "schedules": [
    {
      "id": 1,
      "number": 1,
      "nfe_key": 123456789,
      "client": 78,
      "case_count": 10,
      "date": "2024-01-15",
      "status": "pending",
      "historic": {
        "created": {
          "timestamp": "2024-01-01T10:00:00.000Z",
          "user": "admin_user",
          "action": "Agendamento criado",
          "comment": "Agendamento criado no sistema"
        }
      },
      "qt_prod": 50,
      "client_info": {
        "cnpj": "12345678000100",
        "name": "Cliente Exemplo",
        "number": "78"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### **Buscar Agendamento por ID**
```http
GET /api/schedules/1
Authorization: Bearer <token>
```

#### **Criar Agendamento** (Admin)
```http
POST /api/schedules
Authorization: Bearer <token>
Content-Type: application/json

{
  "number": 1,
  "nfe-key": 123456789,
  "client": 78,
  "case_count": 10,
  "date": "2024-01-15",
  "status": "pending",
  "qt_prod": 50
}
```

#### **Atualizar Agendamento** (Admin)
```http
PUT /api/schedules/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "case_count": 15,
  "status": "processing",
  "qt_prod": 60
}
```

#### **Atualizar Status do Agendamento**
```http
PATCH /api/schedules/1/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "processing",
  "historic_entry": {
    "user": "usuario_atual",
    "action": "Status alterado para processando",
    "comment": "Iniciando processamento"
  }
}
```

#### **Deletar Agendamento** (Manager)
```http
DELETE /api/schedules/1
Authorization: Bearer <token>
```

### **5. Utilitários**

#### **Health Check**
```http
GET /api/health
```

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "database": {
    "dbusers": "connected",
    "dbcheckin": "connected"
  },
  "environment": "development",
  "version": "1.0.0"
}
```

#### **Informações da API**
```http
GET /api/info
```

## 📊 Status Codes

### **Sucesso**
- `200 OK` - Requisição bem-sucedida
- `201 Created` - Recurso criado com sucesso

### **Erro do Cliente**
- `400 Bad Request` - Dados inválidos
- `401 Unauthorized` - Token ausente/inválido
- `403 Forbidden` - Permissões insuficientes
- `404 Not Found` - Recurso não encontrado
- `409 Conflict` - Conflito (dados duplicados)
- `429 Too Many Requests` - Rate limit excedido

### **Erro do Servidor**
- `500 Internal Server Error` - Erro interno

## 🔄 Exemplos de Uso em JavaScript

### **Login e Armazenamento do Token**
```javascript
// Login
const loginUser = async (user, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user, password })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Armazenar token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
};
```

### **Função Genérica para Requisições Autenticadas**
```javascript
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    },
    ...options
  };

  const response = await fetch(`/api${endpoint}`, config);
  
  if (response.status === 401) {
    // Token expirado - redirecionar para login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return;
  }

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Erro na requisição');
  }
  
  return data;
};
```

### **Listar Usuários com Paginação**
```javascript
const getUsers = async (page = 1, limit = 10, search = '') => {
  try {
    const data = await apiRequest(`/users?page=${page}&limit=${limit}&search=${search}`);
    return data;
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw error;
  }
};
```

### **Criar Agendamento**
```javascript
const createSchedule = async (scheduleData) => {
  try {
    const data = await apiRequest('/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData)
    });
    return data;
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    throw error;
  }
};
```

### **Atualizar Status do Agendamento**
```javascript
const updateScheduleStatus = async (scheduleId, status, comment) => {
  try {
    const data = await apiRequest(`/schedules/${scheduleId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        historic_entry: {
          user: getCurrentUser().user,
          action: `Status alterado para ${status}`,
          comment
        }
      })
    });
    return data;
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    throw error;
  }
};
```

## 🛡️ Considerações de Segurança

### **Token Management**
- Armazene o token de forma segura (localStorage/sessionStorage)
- Implemente refresh automático de tokens
- Remova tokens ao fazer logout
- Verifique expiração do token antes de requisições
- Tokens expiram em 7 dias (configurável via JWT_EXPIRE)

### **Configuração Segura da API**
- Use uma chave JWT_SECRET forte (mínimo 32 caracteres)
- Configure HTTPS em produção
- Use rate limiting para prevenir ataques
- Configure CORS apenas para domínios confiáveis

### **Tratamento de Erros**
```javascript
const handleApiError = (error) => {
  if (error.message.includes('401')) {
    // Token inválido - redirecionar para login
    logout();
  } else if (error.message.includes('403')) {
    // Permissões insuficientes
    showErrorMessage('Você não tem permissão para esta ação');
  } else if (error.message.includes('429')) {
    // Rate limit
    showErrorMessage('Muitas tentativas. Aguarde alguns minutos.');
  } else {
    // Erro genérico
    showErrorMessage('Erro interno. Tente novamente.');
  }
};
```

## 📝 Validação de Dados

### **Campos Obrigatórios por Endpoint**

#### **Login:**
- `user` (string, 3-50 chars)
- `password` (string, 3-50 chars)

#### **Registro de Usuário:**
- `user` (string, 3-50 chars, único)
- `password` (string, 3-50 chars)
- `name` (string, 2-50 chars)
- `email` (email válido, opcional)
- `level_access` (integer, 0-2)
- `created_by` (string, 50 chars)

#### **Produto:**
- `cli_code` (string, 50 chars)
- `cli_cnpj` (string, 14 chars)
- `cli_desc` (string, 100 chars)
- `supp_code` (string, 50 chars)
- `supp_cnpj` (string, 14 chars)
- `user` (string, 50 chars)

#### **Agendamento:**
- `number` (integer, 0-255)
- `nfe-key` (integer)
- `client` (integer)
- `case_count` (integer, ≥0)
- `date` (ISO date)
- `qt_prod` (integer, ≥0)

## 🎯 Dicas de Implementação

1. **Sempre valide dados no frontend** antes de enviar
2. **Implemente loading states** durante requisições
3. **Use debounce** em campos de busca
4. **Gerencie estados** de autenticação globalmente
5. **Implemente retry** para requisições falhadas
6. **Cache dados** quando apropriado
7. **Teste cenários de erro** thoroughly

## 📊 Status da API

Para verificar o status da API:

```http
GET /api/health
```

**Resposta:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": "2 hours, 15 minutes",
  "database": {
    "dbusers": "connected",
    "dbcheckin": "connected"
  },
  "version": "1.0.0"
}
```

---

**Esta documentação fornece todos os recursos necessários para integração completa com a API.**
**🔄 Última atualização:** Janeiro 2024 