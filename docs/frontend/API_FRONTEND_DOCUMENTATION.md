# 📚 API Documentation for Frontend Integration

Documentação completa para integração com a API REST de gerenciamento de agendamentos.

## 📋 Base URL

```
http://localhost:3000/api
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

## ⚠️ ATENÇÃO - Inconsistência Encontrada

**IMPORTANTE:** Foi detectada uma inconsistência entre a estrutura do banco de dados e o código da aplicação:

- **Estrutura do banco:** `level_access` é definido como JSON
- **Código da aplicação:** `level_access` é tratado como integer (0-2)

**Recomendação:** Ajustar a estrutura do banco para `INT` ou atualizar o código para trabalhar com JSON. Atualmente, a API funciona com integers conforme documentado abaixo.

**Níveis de acesso atuais:**
- `0` - Desenvolvedor (acesso total a todas as funcionalidades)
- `1` - Usuário comum (acesso limitado conforme cli_access)
- `2` - Administrador (acesso administrativo)
- `3` - Gerente (acesso gerencial - pode deletar usuários)

## 🗄️ Estrutura dos Bancos de Dados

### **Banco dbusers:**
**Tabela: users**
- `id` (int, auto_increment) - Identificador único
- `user` (varchar(50)) - Nome de usuário
- `password` (varchar(50)) - Senha do usuário
- `name` (varchar(50)) - Nome completo
- `email` (varchar(50)) - Email do usuário
- `level_access` (json) - Níveis de acesso (⚠️ ATENÇÃO: estrutura é JSON no banco mas código trata como integer 0-2)
- `cli_access` (json) - Acesso por cliente (CNPJ → dados do cliente)
- `created_by` (varchar(50)) - Usuário que criou
- `created_at` (datetime) - Data de criação

### **Banco dbcheckin:**
**Tabela: products**
- `cli_code` (varchar(50)) - Código do cliente
- `cli_cnpj` (varchar(14)) - CNPJ do cliente
- `cli_desc` (varchar(100)) - Descrição do cliente
- `supp_code` (varchar(50)) - Código do fornecedor
- `supp_cnpj` (varchar(14)) - CNPJ do fornecedor
- `supp_desc` (varchar(100)) - Descrição do fornecedor
- `user` (varchar(50)) - Usuário responsável
- `date` (datetime) - Data do registro
- `hist` (json) - Histórico de alterações
- `latest_into_case` (int) - Último caso relacionado

**Tabela: schedule_list**
- `id` (int, auto_increment) - Identificador único
- `number` (tinyint) - Número do agendamento (0-255)
- `nfe_key` (varchar(44)) - Chave da NFe
- `client` (varchar(14)) - CNPJ do cliente
- `case_count` (int) - Quantidade de casos
- `date` (date) - Data do agendamento
- `status` (varchar(20)) - Status do agendamento
- `historic` (json) - Histórico de alterações
- `supplier` (varchar(50)) - Fornecedor
- `qt_prod` (int) - Quantidade de produtos
- `history` (json) - Histórico adicional
- `info` (json) - Informações adicionais

## 🌐 Configuração do CORS

A API está configurada para aceitar requests das seguintes origens:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:8080`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`
- `http://127.0.0.1:8080`
- `null` (para arquivos HTML abertos diretamente no navegador)

### 🖥️ Executando o Front-end

Para evitar problemas de CORS, recomenda-se executar o front-end através de um servidor web:

**Opção 1: Usando Python (recomendado)**
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

**Opção 2: Usando Node.js**
```bash
npx http-server -p 8080
```

**Opção 3: Usando Live Server (VS Code)**
- Instale a extensão "Live Server" no VS Code
- Clique com o botão direito no arquivo HTML
- Selecione "Open with Live Server"

**Opção 4: Abrindo arquivo HTML diretamente**
- A API permite origem `null` para desenvolvimento
- Simplesmente abra o arquivo HTML no navegador

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
    "level_access": 1,
    "cli_access": {
      "12345678000100": {
        "nome": "Cliente Exemplo",
        "numero": "001"
      }
    }
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
  "cli_access": {
    "12345678000100": {
      "nome": "Cliente Exemplo",
      "numero": "001"
    }
  },
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
      "cli_access": {
        "12345678000100": {
          "nome": "Cliente Exemplo",
          "numero": "001"
        }
      },
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
      "date": "2024-01-01T10:00:00.000Z",
      "hist": {
        "created": {
          "timestamp": "2024-01-01T10:00:00.000Z",
          "user": "admin",
          "action": "Produto criado"
        }
      },
      "latest_into_case": 123
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
      "nfe_key": "12345678901234567890123456789012345678901234",
      "client": "12345678000100",
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
      "supplier": "FORNECEDOR123",
      "qt_prod": 50,
      "history": {
        "modifications": []
      },
      "info": {
        "additional_data": "Informações extras"
      },
      "client_info": {
        "cnpj": "12345678000100",
        "name": "Cliente Exemplo",
        "number": "001"
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
  "nfe-key": "12345678901234567890123456789012345678901234",
  "client": "12345678000100",
  "case_count": 10,
  "date": "2024-01-15",
  "status": "pending",
  "supplier": "FORNECEDOR123",
  "qt_prod": 50
}
```

#### **Atualizar Agendamento** (Admin)
```http
PUT /api/schedules/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "number": "123456",
  "nfe_key": "12345678901234567890123456789012345678901234",
  "status": "Agendado",
  "date": "2025-01-24",
  "client": "12345678000100",
  "case_count": 15,
  "qt_prod": 60,
  "observations": "Observações sobre a entrega",
  "historic": {
    "existing_entries": "...",
    "edit_1642889123456": {
      "timestamp": "2025-01-23T14:30:00.000Z",
      "user": "admin",
      "action": "Agendamento editado via modal",
      "changes": [
        "Status: \"Solicitado\" → \"Agendado\"",
        "Data de entrega: \"23/01/2025 10:00\" → \"24/01/2025 00:00\"",
        "Volumes: 10 → 15"
      ],
      "comment": "Alterações realizadas: Status: \"Solicitado\" → \"Agendado\", Data de entrega: \"23/01/2025 10:00\" → \"24/01/2025 00:00\", Volumes: 10 → 15"
    }
  }
}
```

**⚠️ IMPORTANTE - Histórico de Alterações:**
- Todas as edições de agendamento **DEVEM** incluir uma entrada no campo `historic`
- A chave da entrada deve ser única (ex: `edit_{timestamp}`)
- Deve registrar: **quem** fez a alteração, **quando**, **quais** campos foram alterados
- O campo `changes` deve listar as alterações no formato: `"Campo: valor_antigo → valor_novo"`
- Esta funcionalidade é **obrigatória** para auditoria e rastreabilidade

**Estrutura do Histórico:**
```json
{
  "historic": {
    "edit_{timestamp}": {
      "timestamp": "ISO_DATE_STRING",
      "user": "NOME_DO_USUARIO",
      "action": "DESCRICAO_DA_ACAO",
      "changes": ["LISTA_DE_MUDANCAS_DETALHADAS"],
      "comment": "RESUMO_DAS_ALTERACOES"
    }
  }
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

#### **Parse de XML NFe** (Nova Rota)
```http
POST /api/schedules/parse-xml
Authorization: Bearer <token>
Content-Type: multipart/form-data

Enviar arquivo XML via FormData com key "xml_file"
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "XML parseado com sucesso",
  "data": {
    "nfe_number": "123456",
    "nfe_key": "12345678901234567890123456789012345678901234",
    "nfe_model": "55",
    "nfe_series": "1",
    "nfe_date": "2023-12-01T10:00:00",
    "issuer": {
      "cnpj": "12345678000195",
      "name": "Empresa Emissora LTDA",
      "fantasy": "Emissora"
    },
    "recipient": {
      "cnpj": "98765432000187",
      "name": "Cliente Destinatário"
    },
    "products": [
      {
        "item": 1,
        "code": "PROD001",
        "description": "Produto Teste",
        "ncm": "12345678",
        "quantity": 10,
        "unit": "UN",
        "unit_value": 15.50,
        "total_value": 155.00
      }
    ],
    "total_products": 1
  }
}
```

**Possíveis Erros:**
```json
{
  "error": "Arquivo XML é obrigatório"
}
```

```json
{
  "error": "Estrutura XML inválida - NFe não encontrada"
}
```

```json
{
  "error": "Erro ao processar arquivo XML"
}
```

> **Nota:** Esta rota apenas faz o parse do XML e retorna os dados estruturados, sem salvar no banco de dados. É ideal para validar o conteúdo antes de criar um agendamento.

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

### **Verificar Produtos Existentes**
```http
POST /api/products/check-existing
Authorization: Bearer <token>
Content-Type: application/json

{
  "products": [
    {
      "supp_code": "SUPP001",
      "supp_cnpj": "98765432000100",
      "cli_cnpj": "12345678000100"
    }
  ]
}
```
**Resposta:**
```json
{
  "results": [
    {
      "supp_code": "SUPP001",
      "exists": true,
      "data": { /* dados do produto se existir */ }
    }
  ]
}
```

### **Listar Clientes (WCL)**
```http
GET /api/clients
Authorization: Bearer <token>
```
**Resposta:**
```json
{
  "clients": [
    { "cnpj": "12345678000100", "name": "Cliente Exemplo" }
  ]
}
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

## Novo fluxo de criação de agendamento via NFe

1. O frontend deve fazer o parse do XML da NFe localmente (exemplo: usando xml2js ou similar em JS).
2. Após o usuário revisar os dados, envie o JSON resultante para o endpoint:

POST /api/schedules/create-with-products

Body:
{
  nfe_data: {
    number: <string>,
    nfe_key: <string>,
    client_cnpj: <string>,
    client_name: <string>,
    supplier_cnpj: <string>,
    supplier_name: <string>,
    case_count: <number>,
    date: <string>,
    products: [ ... ],
    qt_prod: <number>
  }
}

- Não envie o arquivo XML para o backend.
- O backend não faz mais o parse do XML, apenas recebe e valida o JSON.

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
- `level_access` (integer, 0-2: 0=usuário, 1=admin, 2=manager)
- `cli_access` (object, estrutura JSON: cnpj → {nome, numero})
- `created_by` (string, 50 chars)

#### **Produto:**
- `cli_code` (string, 50 chars)
- `cli_cnpj` (string, 14 chars)
- `cli_desc` (string, 100 chars)
- `supp_code` (string, 50 chars)
- `supp_cnpj` (string, 14 chars)
- `supp_desc` (string, 100 chars)
- `user` (string, 50 chars)

#### **Agendamento:**
- `number` (tinyint, 0-255)
- `nfe_key` (string, máximo 44 chars)
- `client` (string, 14 chars - CNPJ)
- `case_count` (integer, ≥0)
- `date` (date)
- `status` (string, 20 chars)
- `supplier` (string, 50 chars)
- `qt_prod` (integer, ≥0)

## 🎯 Dicas de Implementação

1. **Sempre valide dados no frontend** antes de enviar
2. **Implemente loading states** durante requisições
3. **Use debounce** em campos de busca
4. **Gerencie estados** de autenticação globalmente
5. **Implemente retry** para requisições falhadas
6. **Cache dados** quando apropriado
7. **Teste cenários de erro** thoroughly
8. **Considere level_access como integer** (0=usuário, 1=admin, 2=manager)
9. **Trate campos JSON** adequadamente no frontend
10. **Use CNPJ formatado** para campos de cliente

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

## 📚 Sistema de Histórico de Alterações

### **Funcionalidade Obrigatória para Agendamentos**

Todas as alterações feitas em agendamentos **DEVEM** ser registradas no campo `historic` para fins de auditoria e rastreabilidade.

### **Estrutura do Histórico**

```json
{
  "historic": {
    "edit_1642889123456": {
      "timestamp": "2025-01-23T14:30:00.000Z",
      "user": "nome_do_usuario",
      "action": "Agendamento editado via modal",
      "changes": [
        "Status: \"Solicitado\" → \"Agendado\"",
        "Data de entrega: \"23/01/2025 10:00\" → \"24/01/2025 00:00\"",
        "Estoque: \"12345678000100\" → \"98765432000100\"",
        "Volumes: 10 → 15",
        "Observações: \"\" → \"Entrega urgente\""
      ],
      "comment": "Alterações realizadas: Status, Data de entrega, Estoque, Volumes, Observações"
    }
  }
}
```

### **Campos Monitorados para Histórico**

1. **Status** - Mudanças de status do agendamento
2. **Data de entrega** - Alterações na data/hora de entrega
3. **Estoque** - Mudanças no estoque de destino (cliente)
4. **Volumes** - Alterações na quantidade de volumes
5. **Observações** - Modificações nas observações

### **Regras de Implementação**

#### **1. Chave Única**
```javascript
const historyKey = `edit_${Date.now()}`;
```

#### **2. Identificação de Mudanças**
```javascript
const identifyChanges = (currentData, newData) => {
  const changes = [];
  
  if (currentData.status !== newData.status) {
    changes.push(`Status: "${currentData.status}" → "${newData.status}"`);
  }
  
  if (formatDate(currentData.date) !== formatDate(newData.date)) {
    changes.push(`Data de entrega: "${formatDate(currentData.date)}" → "${formatDate(newData.date)}"`);
  }
  
  // ... outros campos
  
  return changes;
};
```

#### **3. Exemplo de Implementação no Frontend**
```javascript
const updateScheduleWithHistory = async (scheduleId, newData) => {
  // 1. Buscar dados atuais
  const currentSchedule = await apiRequest(`/schedules/${scheduleId}`);
  
  // 2. Identificar mudanças
  const changes = identifyChanges(currentSchedule.schedule, newData);
  
  // 3. Preparar dados com histórico
  const updateData = {
    ...newData,
    historic: {
      ...currentSchedule.schedule.historic,
      [`edit_${Date.now()}`]: {
        timestamp: new Date().toISOString(),
        user: getCurrentUser(),
        action: 'Agendamento editado via modal',
        changes: changes,
        comment: `Alterações realizadas: ${changes.join(', ')}`
      }
    }
  };
  
  // 4. Enviar atualização
  return await apiRequest(`/schedules/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
};
```

### **Exemplos de Entradas de Histórico**

#### **Alteração de Status**
```json
{
  "status_change_1642889123456": {
    "timestamp": "2025-01-23T14:30:00.000Z",
    "user": "admin",
    "action": "Status alterado para Agendado",
    "changes": ["Status: \"Solicitado\" → \"Agendado\""],
    "comment": "Status alterado via ação em lote"
  }
}
```

#### **Alteração de Data**
```json
{
  "date_change_1642889234567": {
    "timestamp": "2025-01-23T15:45:00.000Z",
    "user": "gerente",
    "action": "Data alterada e contestada",
    "changes": ["Data de entrega: \"24/01/2025\" → \"26/01/2025\""],
    "comment": "Data alterada devido a disponibilidade do cliente",
    "previous_date": "2025-01-24",
    "new_date": "2025-01-26"
  }
}
```

#### **Edição Completa via Modal**
```json
{
  "edit_1642889345678": {
    "timestamp": "2025-01-23T16:20:00.000Z",
    "user": "operador",
    "action": "Agendamento editado via modal",
    "changes": [
      "Status: \"Contestado\" → \"Agendado\"",
      "Data de entrega: \"25/01/2025 08:00\" → \"26/01/2025 14:00\"",
      "Volumes: 8 → 12",
      "Observações: \"\" → \"Cliente solicitou entrega no período da tarde\""
    ],
    "comment": "Múltiplas alterações realizadas via interface de edição"
  }
}
```

### **Benefícios do Sistema de Histórico**

1. **Auditoria Completa** - Rastreamento de todas as alterações
2. **Responsabilização** - Identificação de quem fez cada alteração
3. **Cronologia** - Histórico temporal das mudanças
4. **Transparência** - Visibilidade total das modificações
5. **Conformidade** - Atendimento a requisitos de compliance

### **Visualização do Histórico**

O histórico pode ser exibido na interface do usuário de forma cronológica:

```javascript
const displayHistory = (historic) => {
  const entries = Object.entries(historic)
    .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return entries.map(([key, entry]) => ({
    id: key,
    timestamp: formatDate(entry.timestamp),
    user: entry.user,
    action: entry.action,
    changes: entry.changes,
    comment: entry.comment
  }));
};
```

---

**Esta documentação fornece todos os recursos necessários para integração completa com a API.**
**🔄 Última atualização:** Janeiro 2025 - Atualizada com sistema de histórico de alterações 