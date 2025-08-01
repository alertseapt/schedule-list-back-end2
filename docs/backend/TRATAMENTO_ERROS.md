# Sistema de Tratamento de Erros

## Visão Geral

O sistema de tratamento de erros foi implementado para monitorar e gerenciar falhas nas integrações com o Corpem WMS, permitindo que os usuários visualizem, analisem e reprocessem integrações que falharam.

## Funcionalidades

### 1. Detecção de Erros
- **Integração de Produtos**: Monitora falhas no cadastro de produtos no Corpem
- **Integração de NF-e**: Monitora falhas no registro de NF de entrada
- **Verificação de DP**: Monitora falhas na verificação de Documento de Portaria

### 2. Visualização de Erros
- **Aba de Erros**: Nova aba no modal de informações do agendamento
- **Lista de Erros**: Exibe todos os erros com detalhes e timestamps
- **Indicador Visual**: Ícone de alerta na lista de agendamentos para itens com erros

### 3. Reprocessamento
- **Botão de Reprocessamento**: Permite reprocessar integrações falhadas
- **Reprocessamento Inteligente**: Reprocessa produtos primeiro, depois NF
- **Feedback em Tempo Real**: Notificações sobre o status do reprocessamento

## Estrutura de Dados

### Tabela `corpem_integration_logs`
```sql
CREATE TABLE corpem_integration_logs (
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

### Campos Principais
- `schedule_id`: ID do agendamento relacionado
- `integration_type`: Tipo de integração (products/nf_entry)
- `success`: Indica se a integração foi bem-sucedida (1) ou falhou (0)
- `message`: Mensagem de retorno da integração
- `error_details`: Detalhes do erro em formato JSON
- `user_id`: ID do usuário que iniciou a integração
- `created_at`: Data e hora da tentativa

## APIs Implementadas

### 1. Buscar Erros de um Agendamento
```
GET /api/corpem/schedule-errors/:scheduleId
```

**Resposta:**
```json
{
  "success": true,
  "errors": [
    {
      "id": 1,
      "integration_type": "products",
      "success": 0,
      "message": "Erro na integração: Produto não encontrado",
      "error_details": "{\"code\": \"PRODUCT_NOT_FOUND\"}",
      "user_id": "admin",
      "created_at": "2025-01-25T10:30:00.000Z"
    }
  ],
  "errorCounts": {
    "products": 1,
    "nf_entry": 0,
    "dp_verification": 0,
    "total": 1
  },
  "hasErrors": true
}
```

### 2. Buscar Agendamentos com Erros
```
GET /api/corpem/schedules-with-errors?page=1&limit=20
```

**Resposta:**
```json
{
  "success": true,
  "schedules": [
    {
      "id": 123,
      "number": "NF123456",
      "client": "Cliente A",
      "date": "2025-01-25",
      "status": "Agendado",
      "error_count": 2,
      "last_error_date": "2025-01-25T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### 3. Reprocessar Integrações
```
POST /api/corpem/reprocess-integrations/:scheduleId
```

**Resposta:**
```json
{
  "success": true,
  "message": "Reprocessamento iniciado com sucesso",
  "results": {
    "products": {
      "success": true,
      "message": "Produtos integrados com sucesso"
    },
    "nf_entry": {
      "success": true,
      "message": "NF integrada com sucesso"
    }
  },
  "scheduleId": 123
}
```

## Interface do Usuário

### Aba de Tratamento de Erros
- **Localização**: Modal de informações do agendamento
- **Conteúdo**: Lista cronológica de erros com detalhes
- **Ações**: Botão para reprocessar integrações
- **Estados**: Loading, com erros, sem erros

### Indicador Visual na Lista
- **Ícone**: Triângulo de exclamation vermelho
- **Animação**: Pulso contínuo para chamar atenção
- **Tooltip**: "Este agendamento possui erros"
- **Posição**: Ao lado do botão "Detalhes"

### Estados da Interface
1. **Loading**: Spinner durante carregamento
2. **Com Erros**: Lista de erros com botão de reprocessamento
3. **Sem Erros**: Mensagem de confirmação
4. **Reprocessando**: Botão desabilitado com spinner

## Fluxo de Reprocessamento

1. **Usuário clica em "Reprocessar"**
2. **Sistema busca dados do agendamento**
3. **Reprocessa integração de produtos**
4. **Se produtos OK, reprocessa integração de NF**
5. **Registra resultados nos logs**
6. **Atualiza interface com novos dados**
7. **Exibe notificação de sucesso/erro**

## Monitoramento e Logs

### Logs de Reprocessamento
```
🔄 Reprocessando integrações para agendamento 123
🔄 Reprocessando integração de produtos...
📥 Resultado reprocessamento produtos: {success: true, message: "..."}
🔄 Produtos reprocessados com sucesso! Reprocessando integração de NF...
📥 Resultado reprocessamento NF: {success: true, message: "..."}
```

### Logs de Erro
```
💥 EXCEPTION DURANTE INTEGRAÇÃO:
   Tipo do erro: Error
   Mensagem: Produto não encontrado
   Stack: Error: Produto não encontrado...
```

## Configurações

### Variáveis de Ambiente
```env
# Intervalo de verificação de erros (opcional)
ERROR_CHECK_INTERVAL=30000  # 30 segundos
```

### Configurações de Interface
```javascript
// Em NfeInfoModal.vue
const ERROR_ICONS = {
  'products': 'fas fa-boxes text-warning',
  'nf_entry': 'fas fa-file-invoice text-danger',
  'dp_verification': 'fas fa-search text-info'
};
```

## Benefícios

1. **Visibilidade**: Usuários podem ver exatamente onde falharam as integrações
2. **Ação Imediata**: Possibilidade de reprocessar sem intervenção técnica
3. **Histórico**: Registro completo de tentativas e falhas
4. **Monitoramento**: Indicadores visuais para agendamentos problemáticos
5. **Debugging**: Detalhes técnicos disponíveis para análise

## Próximos Passos

1. **Notificações Automáticas**: Alertas por email para erros críticos
2. **Relatórios**: Relatórios periódicos de erros por período
3. **Análise de Tendências**: Identificação de padrões de erro
4. **Integração com Monitoramento**: Alertas para equipe técnica
5. **Dashboard de Erros**: Página dedicada para gestão de erros 