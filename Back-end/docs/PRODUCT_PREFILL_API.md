# API de Pré-preenchimento de Produtos

Este documento descreve como usar a funcionalidade de pré-preenchimento de produtos baseada no histórico de agendamentos.

## Funcionalidade

Quando um produto com o mesmo `supp_code` (código do fornecedor) de um mesmo `supp_cnpj` (CNPJ do fornecedor) aparecer novamente em uma NFe, o sistema pode pré-preencher automaticamente:

- **cli_code**: Código de venda escolhido pelo usuário
- **cli_desc**: Descrição de venda escolhida pelo usuário  
- **latest_into_case**: Último fator escolhido pelo usuário

Se o produto já foi usado pelo mesmo estoque (`supp_code` + `supp_cnpj` + `cli_cnpj`), os campos ficam **bloqueados para alteração** para evitar códigos diferentes para o mesmo produto.

## Endpoints da API

### 1. Buscar Pré-preenchimento Individual

```
GET /api/products/prefill/:suppCode/:suppCnpj?cliCnpj=:cliCnpj
```

**Parâmetros:**
- `suppCode`: Código do produto do fornecedor
- `suppCnpj`: CNPJ do fornecedor (sem máscara)
- `cliCnpj`: CNPJ do estoque/cliente (opcional, via query string)

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "supp_code": "PROD123",
    "supp_desc": "Produto do Fornecedor",
    "supp_cnpj": "12345678000199",
    "cli_code": "VENDAS456",
    "cli_desc": "Produto de Venda",
    "latest_into_case": 2.5,
    "is_locked": true,
    "last_updated": "2024-01-15T10:30:00.000Z",
    "last_user": "admin"
  },
  "message": "Dados de pré-preenchimento encontrados"
}
```

**Resposta quando não encontrado:**
```json
{
  "success": false,
  "data": null,
  "message": "Produto não encontrado no histórico"
}
```

### 2. Buscar Pré-preenchimento em Lote

```
POST /api/products/batch-prefill
```

**Body:**
```json
{
  "products": [
    {
      "supp_code": "PROD123",
      "supp_cnpj": "12345678000199"
    },
    {
      "supp_code": "PROD456", 
      "supp_cnpj": "12345678000199"
    }
  ],
  "cliCnpj": "98765432000188"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "supp_code": "PROD123",
      "supp_cnpj": "12345678000199",
      "prefill_data": {
        "supp_code": "PROD123",
        "supp_desc": "Produto do Fornecedor",
        "supp_cnpj": "12345678000199",
        "cli_code": "VENDAS456",
        "cli_desc": "Produto de Venda",
        "latest_into_case": 2.5,
        "is_locked": true,
        "last_updated": "2024-01-15T10:30:00.000Z",
        "last_user": "admin"
      },
      "has_data": true
    },
    {
      "supp_code": "PROD456",
      "supp_cnpj": "12345678000199", 
      "prefill_data": null,
      "has_data": false
    }
  ],
  "summary": {
    "total": 2,
    "found": 1,
    "not_found": 1
  },
  "message": "1 de 2 produtos encontrados no histórico"
}
```

## Como Integrar no Frontend

### 1. JavaScript/Vue.js Example

```javascript
// Função para buscar pré-preenchimento de um produto
async function getProductPrefill(suppCode, suppCnpj, cliCnpj) {
  try {
    const url = `/api/products/prefill/${suppCode}/${suppCnpj}` + 
                (cliCnpj ? `?cliCnpj=${cliCnpj}` : '');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.data) {
      return {
        prefillData: data.data,
        shouldLock: data.data.is_locked
      };
    }
    
    return { prefillData: null, shouldLock: false };
    
  } catch (error) {
    console.error('Erro ao buscar pré-preenchimento:', error);
    return { prefillData: null, shouldLock: false };
  }
}

// Função para pré-preencher formulário de produto
function prefillProductForm(productElement, prefillData, shouldLock) {
  if (!prefillData) return;
  
  // Preencher campos
  const cliCodeInput = productElement.querySelector('[name="cli_code"]');
  const cliDescInput = productElement.querySelector('[name="cli_desc"]');
  const intoCaseInput = productElement.querySelector('[name="latest_into_case"]');
  
  if (cliCodeInput) cliCodeInput.value = prefillData.cli_code || '';
  if (cliDescInput) cliDescInput.value = prefillData.cli_desc || '';
  if (intoCaseInput) intoCaseInput.value = prefillData.latest_into_case || '';
  
  // Bloquear campos se necessário
  if (shouldLock) {
    if (cliCodeInput) {
      cliCodeInput.disabled = true;
      cliCodeInput.setAttribute('title', 'Campo bloqueado - produto já cadastrado para este estoque');
    }
    if (cliDescInput) {
      cliDescInput.disabled = true;
      cliDescInput.setAttribute('title', 'Campo bloqueado - produto já cadastrado para este estoque');
    }
    
    // Adicionar indicador visual
    productElement.classList.add('product-locked');
  }
}

// Exemplo de uso ao processar NFe
async function processNfeProducts(products, clientCnpj) {
  for (const product of products) {
    const { prefillData, shouldLock } = await getProductPrefill(
      product.supp_code, 
      product.supp_cnpj, 
      clientCnpj
    );
    
    if (prefillData) {
      console.log('Pré-preenchendo produto:', product.supp_code);
      prefillProductForm(product.element, prefillData, shouldLock);
      
      if (shouldLock) {
        console.log('Produto bloqueado para alteração:', product.supp_code);
      }
    }
  }
}
```

### 2. Busca em Lote (Mais Eficiente)

```javascript
// Buscar pré-preenchimento para múltiplos produtos de uma vez
async function batchGetProductPrefill(products, clientCnpj) {
  try {
    const response = await fetch('/api/products/batch-prefill', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        products: products.map(p => ({
          supp_code: p.supp_code,
          supp_cnpj: p.supp_cnpj
        })),
        cliCnpj: clientCnpj
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.data; // Array com resultados para cada produto
    }
    
    return [];
    
  } catch (error) {
    console.error('Erro ao buscar pré-preenchimento em lote:', error);
    return [];
  }
}

// Aplicar pré-preenchimento em lote
async function applyBatchPrefill(products, clientCnpj) {
  const prefillResults = await batchGetProductPrefill(products, clientCnpj);
  
  prefillResults.forEach((result, index) => {
    if (result.has_data && result.prefill_data) {
      const product = products[index];
      prefillProductForm(
        product.element, 
        result.prefill_data, 
        result.prefill_data.is_locked
      );
    }
  });
  
  console.log(`Pré-preenchimento aplicado: ${prefillResults.filter(r => r.has_data).length} de ${products.length} produtos`);
}
```

## Fluxo Recomendado

1. **Ao processar NFe**: Extrair produtos com `supp_code` e `supp_cnpj`
2. **Buscar pré-preenchimento**: Usar API em lote para eficiência
3. **Aplicar dados**: Preencher `cli_code`, `cli_desc` e `latest_into_case`
4. **Bloquear se necessário**: Desabilitar campos se `is_locked = true`
5. **Ao salvar agendamento**: Produtos são automaticamente salvos no banco para futuras consultas

## Campos da Tabela Products

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supp_code VARCHAR(100) NOT NULL,     -- Código do produto do fornecedor
  supp_desc VARCHAR(255) NOT NULL,     -- Descrição do produto do fornecedor  
  supp_cnpj VARCHAR(14) NOT NULL,      -- CNPJ do fornecedor
  cli_code VARCHAR(100) NOT NULL,      -- Código de venda escolhido pelo usuário
  cli_desc VARCHAR(255) NOT NULL,      -- Descrição de venda escolhida pelo usuário
  cli_cnpj VARCHAR(14) NOT NULL,       -- CNPJ do estoque escolhido pelo usuário
  user VARCHAR(50) NOT NULL,           -- Usuário que cadastrou
  date DATETIME NOT NULL,              -- Data do cadastro
  latest_into_case DECIMAL(10,4),      -- Último fator escolhido
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_product_mapping (supp_code, supp_cnpj, cli_cnpj)
);
```

## Regras de Negócio

1. **Pré-preenchimento**: Baseado em `supp_code` + `supp_cnpj`
2. **Bloqueio**: Quando existe combinação exata `supp_code` + `supp_cnpj` + `cli_cnpj`
3. **Atualização**: Dados são atualizados a cada novo agendamento
4. **Constraint única**: Evita duplicação do mesmo produto para o mesmo estoque