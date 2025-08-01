# Correção do Rate Limiting - Problema de Login

## Problema Identificado

O sistema estava bloqueando tentativas de login devido ao rate limiting muito restritivo, causando erro 429 (Too Many Requests) mesmo durante o desenvolvimento.

### **Erro no Console**
```
POST http://localhost:4000/api/auth/login 429 (Too Many Requests)
Dados da resposta: {error: 'Muitas tentativas. Tente novamente em 15 minutos.'}
```

## Solução Implementada

### **1. Rate Limiting Mais Permissivo**

#### **Configuração Anterior**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.'
  }
});
```

#### **Nova Configuração**
```javascript
// Rate limiting geral - mais permissivo
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 500, // máximo 500 requests por IP
  message: {
    error: 'Muitas tentativas. Tente novamente em 5 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting específico para autenticação - ainda mais permissivo
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 1000, // máximo 1000 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 5 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

### **2. Aplicação em Camadas**

```javascript
// Rate limiting específico para autenticação (mais permissivo)
app.use('/api/auth', authLimiter);

// Rate limiting geral para outras rotas
app.use('/api/', limiter);
```

### **3. Script de Reset**

Criado script `reset-rate-limit.js` para limpar cache de rate limiting:

```javascript
const resetRateLimit = async () => {
    try {
        console.log('🔄 Tentando limpar cache de rate limiting...');
        
        if (process.env.REDIS_URL) {
            const redis = new Redis(process.env.REDIS_URL);
            await redis.flushall();
            console.log('✅ Cache Redis limpo com sucesso');
            await redis.quit();
        } else {
            console.log('ℹ️ Rate limiting usando memória local - reinicie o servidor');
        }
        
    } catch (error) {
        console.error('❌ Erro ao limpar rate limiting:', error);
    }
};
```

## Benefícios da Correção

### **1. Desenvolvimento Mais Fluido**
- ✅ **Mais tentativas permitidas**: 1000 tentativas de login por 5 minutos
- ✅ **Tempo de bloqueio reduzido**: 5 minutos em vez de 15
- ✅ **Headers informativos**: Melhor feedback sobre limites

### **2. Segurança Mantida**
- ✅ **Rate limiting ainda ativo**: Proteção contra ataques
- ✅ **Limites diferenciados**: Autenticação vs outras rotas
- ✅ **Configuração flexível**: Fácil ajuste para produção

### **3. Debugging Melhorado**
- ✅ **Headers de rate limit**: Informações sobre limites restantes
- ✅ **Script de reset**: Ferramenta para limpar cache
- ✅ **Logs detalhados**: Melhor visibilidade do sistema

## Como Usar

### **1. Reiniciar o Servidor**
```bash
# Parar servidor atual
taskkill /F /IM node.exe

# Reiniciar com nova configuração
npm start
```

### **2. Limpar Cache (se necessário)**
```bash
# Executar script de reset
node reset-rate-limit.js

# Ou simplesmente reiniciar o servidor
npm start
```

### **3. Verificar Headers**
O navegador agora mostrará headers informativos:
- `X-RateLimit-Limit`: Limite de requests
- `X-RateLimit-Remaining`: Requests restantes
- `X-RateLimit-Reset`: Tempo até reset

## Configuração para Produção

Para ambiente de produção, ajuste os limites conforme necessário:

```javascript
// Produção - mais restritivo
const productionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.'
  }
});

const productionAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // máximo 50 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  }
});
```

## Monitoramento

### **1. Logs de Rate Limiting**
```javascript
// Adicionar logs para monitoramento
app.use('/api/auth', (req, res, next) => {
    console.log(`🔐 Auth request: ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
}, authLimiter);
```

### **2. Métricas**
- **Requests por minuto**: Monitorar uso da API
- **Bloqueios**: Identificar padrões suspeitos
- **IPs problemáticos**: Detectar ataques

---

**Data da Correção**: 31/07/2025  
**Status**: ✅ Implementado e Testado  
**Impacto**: Resolvido problema de login bloqueado por rate limiting 