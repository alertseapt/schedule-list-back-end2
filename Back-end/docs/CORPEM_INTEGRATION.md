# Integração Corpem WMS

Este documento explica como configurar e usar a integração automática com o sistema Corpem WMS para cadastro de mercadorias e integração de NF de entrada.

## Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env`:

```env
# Configurações do Corpem WMS
CORPEM_BASE_URL=http://webcorpem.no-ip.info:37560/scripts/mh.dll/wc
CORPEM_CNPJ_WMS=seu_cnpj_wms_aqui
CORPEM_TOKEN=seu_token_aqui
CORPEM_TOKEN_HEADER=TOKEN_CP
```

**Importante:** 
- O `CORPEM_TOKEN` deve conter o token de autenticação fornecido pelo Corpem (padrão: '6cnc3' conforme repositório de referência).
- O `CORPEM_TOKEN_HEADER` define o nome do header onde o token será enviado (padrão: TOKEN_CP).
- Se não configurado, será usado o token padrão '6cnc3'.
- O `CORPEM_CNPJ_WMS` é usado apenas para testes de conectividade. Para as integrações reais de produtos e NF de entrada, será utilizado o CNPJ do estoque escolhido no agendamento (campo `client` da tabela `schedule_list`).

### 2. Criação da Tabela de Logs

Execute o script SQL em `sql/corpem_integration_logs.sql` para criar a tabela de logs das integrações:

```sql
CREATE TABLE IF NOT EXISTS corpem_integration_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  integration_type ENUM('products', 'nf_entry') NOT NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  message TEXT,
  error_details TEXT,
  user_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Funcionalidades

### 1. Integração 01 - Cadastro de Mercadorias

**Quando acontece:** Automaticamente quando o status de um agendamento muda para "Agendado"

**O que faz:**
- Extrai produtos do campo `info.products` do agendamento
- Mapeia os dados dos produtos para o formato esperado pelo Corpem
- Envia requisição para cadastrar produtos no WMS
- Registra log da operação

**Endpoint manual:** `POST /api/corpem/integrate-products/:scheduleId`

### 2. Integração 02 - NF de Entrada

**Quando acontece:** Automaticamente em:
- Criação de agendamentos (POST /api/schedules/ e POST /api/schedules/create-with-products)
- Alteração de status de agendamentos (PATCH /api/schedules/:id/status)

**O que faz:**
- Extrai dados da NFe do campo `info` do agendamento
- Mapeia produtos e informações da nota fiscal
- Envia requisição para integrar NF de entrada no WMS
- Registra log da operação

**Endpoint manual:** `POST /api/corpem/integrate-nf-entry/:scheduleId`

## CNPJ do Estoque para Integração

**Fundamental:** A integração com Corpem utiliza o **CNPJ do estoque escolhido pelo usuário** durante o agendamento, não um CNPJ fixo.

### Como funciona:
1. Quando o usuário cria um agendamento, ele escolhe um estoque (CNPJ)
2. Este CNPJ é armazenado no campo `client` da tabela `schedule_list`
3. Nas integrações com Corpem, este CNPJ (`scheduleData.client`) é enviado no campo `CGCCLIWMS`
4. Assim cada agendamento usa o CNPJ correto do estoque selecionado

### Validação:
- Se o campo `client` estiver vazio ou inválido, a integração falhará com erro
- O sistema registra no log qual CNPJ está sendo enviado para Corpem

## Estrutura de Dados

### Produtos no Agendamento

Os produtos devem estar no campo `info.products` como um array com os seguintes campos:

```json
{
  "info": {
    "products": [
      {
        "client_code": "VENDA001",     // Cód. Venda (usado como CODPROD no Corpem) ⭐ CAMPO PRINCIPAL
        "client_description": "Produto Venda", // Descrição Venda (usado como NOMEPROD no Corpem) ⭐ CAMPO PRINCIPAL
        "cli_code": "VENDA001",        // Fallback para client_code
        "cli_desc": "Produto Venda",   // Fallback para client_description
        "supp_code": "FORN001",        // Código do Fornecedor (usado como CODFAB no Corpem)
        "supp_desc": "Produto Fornecedor", // Descrição do Fornecedor (usado como NOMEFAB no Corpem)
        "supplier_code": "FORN001",    // Fallback para supp_code
        "supplier_description": "Produto Fornecedor", // Fallback para supp_desc
        "description": "Produto Genérico", // Fallback geral
        "ncm": "12345678",
        "quantity": 10,
        "unit": "UN",
        "unit_value": 15.50,
        "total_value": 155.00,
        "ean_code": "1234567890123"
      }
    ]
  }
}
```

#### Mapeamento de Campos para Corpem:

- **CODPROD**: `client_code` (Cód. Venda da aba Produtos da NFe) → fallback: `cli_code` → fallback: `supplier_code` → fallback: código gerado
- **NOMEPROD**: `client_description` (Descrição Venda da aba Produtos da NFe) → fallback: `cli_desc` → fallback: `supplier_description` → fallback: `description`
- **CODFAB**: `supp_code` (Código do Fornecedor) → fallback: `supplier_code`
- **NOMEFAB**: `supp_desc` (Descrição do Fornecedor) → fallback: `supplier_description` → fallback: nome do fornecedor do agendamento
- **CODPROD_FORN**: `supp_code` (Código do Fornecedor) → fallback: `supplier_code`

**Importante**: Os campos `client_code` e `client_description` correspondem aos valores "Cód. Venda" e "Descrição Venda" exibidos na aba "Produtos" da janela de informações da NF-e no frontend.

### Dados da NFe

Os dados da NFe devem estar no campo `info` seguindo a estrutura XMLParser:

```json
{
  "info": {
    "ide": {
      "serie": "1",
      "dhEmi": "2025-01-25T10:00:00"
    },
    "emit": {
      "CNPJ": "12345678000100",
      "xNome": "Fornecedor Ltda"
    },
    "total": {
      "ICMSTot": {
        "vNF": 155.00,
        "vProd": 155.00
      }
    }
  }
}
```

## Endpoints da API

### Administrativos (requerem nível admin)

- `GET /api/corpem/test-connection` - Testa conectividade com Corpem
- `POST /api/corpem/integrate-products/:scheduleId` - Integra produtos manualmente
- `POST /api/corpem/integrate-nf-entry/:scheduleId` - Integra NF de entrada manualmente
- `GET /api/corpem/integration-logs` - Lista logs das integrações
- `POST /api/corpem/reprocess-failed` - Reprocessa integrações falhadas

### Parâmetros de Query para Logs

- `page` - Página (padrão: 1)
- `limit` - Itens por página (padrão: 20)
- `scheduleId` - Filtrar por agendamento específico
- `type` - Filtrar por tipo (products ou nf_entry)

## Triggers Automáticos

### 1. Status "Agendado" → Cadastro de Produtos

```javascript
if (status === 'Agendado' && schedule.status !== 'Agendado') {
  triggerProductsIntegration(updatedSchedule, req.user.user);
}
```

### 2. Criação/Alteração → NF de Entrada

```javascript
// Em todos os agendamentos
triggerNfEntryIntegration(scheduleData, req.user.user);
```

## Tratamento de Erros

- Todas as integrações são executadas de forma assíncrona para não bloquear a resposta da API
- Erros são registrados na tabela `corpem_integration_logs`
- Logs incluem mensagens de sucesso/erro e detalhes técnicos
- Configurações inválidas são verificadas antes da tentativa de integração

## Monitoramento e Logs

### Logs Detalhados no Console

O sistema agora registra logs detalhados de todas as requisições HTTP feitas à API do Corpem diretamente no console. Cada requisição gera um log completo com:

#### Informações Básicas:
- Timestamp da requisição
- Duração da requisição (em ms)
- ID do agendamento (quando aplicável)
- Tipo de integração (products, nf_entry, test_connection)

#### Detalhes da Requisição:
- Método HTTP
- URL completa
- Headers enviados
- Payload completo (JSON formatado)

#### Detalhes da Resposta:
- Status HTTP
- Headers de resposta
- Body da resposta (JSON formatado)
- Status de sucesso/erro do Corpem
- Mensagens de erro específicas do Corpem

#### Exemplo de Log:
```
================================================================================
🌐 CORPEM API REQUEST LOG - PRODUCTS
================================================================================
📅 Timestamp: 2025-01-25T14:30:00.000Z
⏱️  Duração: 1234ms
📋 Schedule ID: 123
🔧 Tipo de Integração: products

📤 REQUEST DETAILS:
   Método: POST
   URL: http://webcorpem.no-ip.info:37560/scripts/mh.dll/wc
   Headers: {
     "Content-Type": "application/json",
     "TOKEN_CP": ""
   }
   Payload:
   {
     "CORPEM_ERP_MERC": {
       "CGCCLIWMS": "12345678000100",
       "PRODUTOS": [...]
     }
   }

📥 RESPONSE DETAILS:
   Status: 200 OK
   Headers: {...}
   Body:
   {
     "CORPEM_WS_OK": "OK",
     "CORPEM_WS_ERRO": ""
   }

✅ Status: SUCESSO
================================================================================
```

### Verificar Status das Integrações

```bash
GET /api/corpem/integration-logs?type=products&scheduleId=123
```

### Reprocessar Integrações Falhadas

```bash
POST /api/corpem/reprocess-failed
{
  "scheduleIds": [123, 456],
  "integrationType": "products"
}
```

## Segurança

- Todos os endpoints requerem autenticação JWT
- Endpoints administrativos requerem nível de acesso admin
- Token do Corpem é enviado vazio no header `TOKEN_CP` conforme especificação
- Dados sensíveis não são logados nos detalhes de erro