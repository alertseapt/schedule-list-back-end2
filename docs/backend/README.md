---

## Instruções para a Equipe de Front-end

### 1. Autenticação
- Todas as rotas (exceto login) exigem autenticação JWT.
- Inclua o header em todas as requisições protegidas:
  ```
  Authorization: Bearer <token>
  ```
- O token é obtido via `/api/auth/login` e deve ser armazenado de forma segura (ex: localStorage).

### 2. Consumo dos Endpoints

#### a) Listar Clientes
- **GET /api/clients**
- Retorna todos os clientes cadastrados.
- Exemplo de resposta:
  ```json
  {
    "data": [
      { "cnpj": "12345678000100", "name": "Cliente Exemplo" },
      { "cnpj": "98765432000100", "name": "Outro Cliente" }
    ]
  }
  ```
- Se não houver clientes, retorna `{ "data": [] }`.
- Se o token for inválido, retorna 401.

#### a2) Validar CNPJ do Cliente
- **POST /api/clients/validate-cnpj**
- Valida se um CNPJ existe na tabela wcl do banco dbmercocamp.
- Requisição:
  ```json
  {
    "cnpj": "12345678000100"
  }
  ```
- Resposta:
  ```json
  {
    "exists": true,
    "client": { "cnpj": "12345678000100", "name": "Cliente Exemplo" }
  }
  ```
- Se o CNPJ não existir:
  ```json
  {
    "exists": false,
    "client": null
  }
  ```
- Se o token for inválido, retorna 401.

#### b) Verificar Produtos Existentes
- **POST /api/products/check-existing**
- Envie um array de produtos para checar existência:
  ```json
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
- Resposta:
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

#### c) Criar Agendamento via NFe
- **POST /api/schedules/create-with-products**
- Envie o JSON parseado do XML da NFe:
  ```json
  {
    "nfe_data": {
      "number": "123456",
      "nfe_key": "12345678901234567890123456789012345678901234",
      "client_cnpj": "12345678000100",
      "client_name": "Cliente Exemplo",
      "supplier_cnpj": "98765432000100",
      "supplier_name": "Fornecedor Exemplo",
      "case_count": 10,
      "date": "2024-01-15",
      "products": [ ... ],
      "qt_prod": 50
    }
  }
  ```
- Resposta: dados do agendamento criado.

#### d) Listar Agendamentos
- **GET /api/schedules**
- Suporta filtros e paginação via query params.
- Exemplo de resposta:
  ```json
  {
    "schedules": [ ... ],
    "pagination": { "page": 1, "limit": 10, "total": 25, "pages": 3 }
  }
  ```

### 3. Tratamento de Erros
- Sempre verifique o status HTTP da resposta.
- Erros comuns:
  - 400: Dados inválidos (mensagem no corpo)
  - 401: Token inválido/ausente
  - 403: Permissão insuficiente
  - 404: Não encontrado
  - 500: Erro interno
- Exemplo de erro:
  ```json
  { "error": "Mensagem descritiva do erro" }
  ```

### 4. Dicas de Integração
- Sempre valide os dados no front-end antes de enviar.
- Implemente loading states e tratamento de erros visuais.
- Use debounce em campos de busca.
- Gerencie o token globalmente e implemente logout automático em caso de 401.
- Consulte este README para contratos de resposta e exemplos.

### 5. Observações Importantes
- O endpoint `/api/clients` é obrigatório para o fluxo de criação de agendamento.
- O backend segue fielmente os contratos descritos aqui. Se houver divergência, comunique a equipe backend.
- Para dúvidas sobre campos ou payloads, consulte o código das rotas ou peça exemplos à equipe backend. 