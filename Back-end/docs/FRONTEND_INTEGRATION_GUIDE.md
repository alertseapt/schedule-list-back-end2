# Guia de Integração Frontend - Pré-preenchimento de Produtos

Este documento explica como implementar o pré-preenchimento automático de produtos no frontend.

## 🎯 Objetivo

Quando o usuário criar um agendamento e processar uma NFe:
- Se um produto (`supp_code`) do mesmo fornecedor (`supp_cnpj`) para o mesmo estoque (`cli_cnpj`) já existir na base
- Os campos `cli_code` (código de venda) e `cli_desc` (descrição de venda) devem ser **pré-preenchidos automaticamente**
- Esses campos devem ficar **desabilitados** para evitar alterações

## 📡 APIs Disponíveis

### 1. Verificar Produtos Existentes (Recomendado)
```http
POST /api/products/batch-prefill
Content-Type: application/json
Authorization: Bearer {token}

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
        "cli_code": "VENDA456",
        "cli_desc": "Produto de Venda",
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
  }
}
```

## 🔧 Implementação no Frontend

### JavaScript/Vue.js

```javascript
/**
 * Função para buscar pré-preenchimento ao processar NFe
 */
async function applyProductPrefill(products, clientCnpj) {
  try {
    console.log('🔍 Buscando pré-preenchimento para produtos...');
    
    // Preparar dados para a API
    const productsToCheck = products.map(product => ({
      supp_code: product.supp_code || product.supplier_code,
      supp_cnpj: product.supp_cnpj || extractSupplierCnpj(product)
    }));

    // Chamar API de pré-preenchimento
    const response = await fetch('/api/products/batch-prefill', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        products: productsToCheck,
        cliCnpj: clientCnpj
      })
    });

    const result = await response.json();
    
    if (!result.success) {
      console.error('Erro ao buscar pré-preenchimento:', result.message);
      return;
    }

    console.log(`📊 Pré-preenchimento: ${result.summary.found} de ${result.summary.total} produtos encontrados`);

    // Aplicar pré-preenchimento nos produtos
    result.data.forEach((prefillResult, index) => {
      if (prefillResult.has_data && prefillResult.prefill_data) {
        const product = products[index];
        const prefillData = prefillResult.prefill_data;
        
        console.log(`✅ Pré-preenchendo produto: ${prefillData.supp_code}`);
        
        // Pré-preencher campos
        product.cli_code = prefillData.cli_code;
        product.cli_desc = prefillData.cli_desc;
        
        // Marcar como bloqueado se necessário
        if (prefillData.is_locked) {
          product.is_locked = true;
          console.log(`🔒 Produto ${prefillData.supp_code} bloqueado para alteração`);
        }
        
        // Atualizar interface
        updateProductUI(product, prefillData.is_locked);
      }
    });

  } catch (error) {
    console.error('❌ Erro ao aplicar pré-preenchimento:', error);
  }
}

/**
 * Atualizar interface do produto
 */
function updateProductUI(product, isLocked) {
  const productElement = document.querySelector(`[data-product-id="${product.id}"]`);
  if (!productElement) return;

  // Atualizar campos
  const cliCodeInput = productElement.querySelector('[name="cli_code"]');
  const cliDescInput = productElement.querySelector('[name="cli_desc"]');
  
  if (cliCodeInput) {
    cliCodeInput.value = product.cli_code || '';
    cliCodeInput.disabled = isLocked;
    
    if (isLocked) {
      cliCodeInput.classList.add('locked-field');
      cliCodeInput.title = 'Campo bloqueado - produto já cadastrado para este estoque';
    }
  }
  
  if (cliDescInput) {
    cliDescInput.value = product.cli_desc || '';
    cliDescInput.disabled = isLocked;
    
    if (isLocked) {
      cliDescInput.classList.add('locked-field');
      cliDescInput.title = 'Campo bloqueado - produto já cadastrado para este estoque';
    }
  }
  
  // Adicionar indicador visual
  if (isLocked) {
    productElement.classList.add('product-locked');
    
    // Adicionar ícone de bloqueio
    const lockIcon = document.createElement('span');
    lockIcon.className = 'lock-icon';
    lockIcon.innerHTML = '🔒';
    lockIcon.title = 'Produto já cadastrado - campos bloqueados';
    
    const header = productElement.querySelector('.product-header');
    if (header) {
      header.appendChild(lockIcon);
    }
  }
}

/**
 * Exemplo de uso ao processar NFe
 */
async function processNfeFile(xmlFile, clientCnpj) {
  try {
    // 1. Processar XML da NFe
    const nfeData = await parseNfeXml(xmlFile);
    
    // 2. Extrair produtos
    const products = extractProductsFromNfe(nfeData);
    
    // 3. Aplicar pré-preenchimento
    await applyProductPrefill(products, clientCnpj);
    
    // 4. Renderizar formulário com produtos
    renderProductForm(products);
    
  } catch (error) {
    console.error('Erro ao processar NFe:', error);
  }
}
```

### CSS para Campos Bloqueados

```css
/* Estilo para campos bloqueados */
.locked-field {
  background-color: #f5f5f5 !important;
  border: 2px solid #e0e0e0 !important;
  color: #666 !important;
  cursor: not-allowed !important;
}

.locked-field:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.25) !important;
}

/* Indicador visual para produto bloqueado */
.product-locked {
  position: relative;
  border-left: 4px solid #ffc107;
  background-color: #fffbf0;
}

.product-locked .lock-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 16px;
  color: #f39c12;
}

/* Tooltip para explicação */
.locked-field::after {
  content: attr(title);
  position: absolute;
  background: #333;
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.locked-field:hover::after {
  opacity: 1;
}
```

## 🔄 Fluxo Completo

1. **Usuário seleciona NFe e estoque**
2. **Frontend processa XML** e extrai produtos
3. **Frontend chama `/api/products/batch-prefill`** com lista de produtos
4. **Backend retorna** dados de pré-preenchimento
5. **Frontend aplica** pré-preenchimento nos campos
6. **Frontend bloqueia** campos quando `is_locked = true`
7. **Usuário submete** formulário (campos bloqueados mantêm valores)
8. **Backend salva** agendamento normalmente

## ⚠️ Regras de Negócio

- **Pré-preenchimento**: Baseado em `supp_code` + `supp_cnpj` (qualquer estoque)
- **Bloqueio**: Quando existe combinação exata `supp_code` + `supp_cnpj` + `cli_cnpj`
- **Prioridade**: Se produto existe para este estoque específico, usar esses dados
- **Fallback**: Se não existe para este estoque, usar dados de outro estoque como sugestão

## 🧪 Como Testar

1. **Crie um agendamento** com produtos
2. **Altere status para "Agendado"** (salva produtos na base)
3. **Crie novo agendamento** com mesmo fornecedor e estoque
4. **Verifique se campos são pré-preenchidos** e bloqueados

## 📝 Exemplo de Implementação Vue.js

```vue
<template>
  <div class="product-form">
    <div 
      v-for="(product, index) in products" 
      :key="index"
      :data-product-id="product.id"
      class="product-item"
      :class="{ 'product-locked': product.is_locked }"
    >
      <div class="product-header">
        <h4>{{ product.supp_code }} - {{ product.supp_desc }}</h4>
        <span v-if="product.is_locked" class="lock-icon" title="Produto já cadastrado - campos bloqueados">🔒</span>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Código de Venda:</label>
          <input 
            v-model="product.cli_code"
            :disabled="product.is_locked"
            :class="{ 'locked-field': product.is_locked }"
            :title="product.is_locked ? 'Campo bloqueado - produto já cadastrado para este estoque' : ''"
          />
        </div>
        
        <div class="form-group">
          <label>Descrição de Venda:</label>
          <input 
            v-model="product.cli_desc"
            :disabled="product.is_locked"
            :class="{ 'locked-field': product.is_locked }"
            :title="product.is_locked ? 'Campo bloqueado - produto já cadastrado para este estoque' : ''"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      products: []
    };
  },
  
  methods: {
    async processNfe(xmlFile, clientCnpj) {
      // Processar NFe...
      const nfeData = await this.parseNfeXml(xmlFile);
      this.products = this.extractProducts(nfeData);
      
      // Aplicar pré-preenchimento
      await this.applyPrefill(clientCnpj);
    },
    
    async applyPrefill(clientCnpj) {
      const response = await fetch('/api/products/batch-prefill', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.$auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: this.products.map(p => ({
            supp_code: p.supp_code,
            supp_cnpj: p.supp_cnpj
          })),
          cliCnpj: clientCnpj
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        result.data.forEach((prefill, index) => {
          if (prefill.has_data && prefill.prefill_data) {
            const product = this.products[index];
            product.cli_code = prefill.prefill_data.cli_code;
            product.cli_desc = prefill.prefill_data.cli_desc;
            product.is_locked = prefill.prefill_data.is_locked;
          }
        });
      }
    }
  }
};
</script>
```

Este guia fornece tudo que o frontend precisa para implementar o pré-preenchimento automático com bloqueio de campos! 🚀