# 🚨 TROUBLESHOOTING - Erros 500 no IIS

## ⚠️ Problema Identificado
Erros 500 (Internal Server Error) indicam problema na configuração do IIS ou módulos ausentes.

## 🔍 DIAGNÓSTICO RÁPIDO

### 1. Verificar se URL Rewrite Module está instalado
**No servidor IIS:**
```powershell
# Verificar se o módulo está instalado
Get-WindowsFeature -Name IIS-HttpRedirect
```

**OU no IIS Manager:**
- Abrir IIS Manager
- Selecionar o site
- Procurar por "URL Rewrite" na lista de módulos
- Se não aparecer = módulo não está instalado

### 2. Testar com web.config básico (ATUAL)
O arquivo `web.config` atual é ultra-básico e deve funcionar sem módulos extras.

### 3. Se ainda der erro 500 com web.config básico:

#### A) Verificar permissões
```powershell
# Dar permissões para IIS_IUSRS
icacls "C:\caminho\para\dist" /grant IIS_IUSRS:(OI)(CI)F
```

#### B) Verificar se .NET está instalado
- IIS pode precisar do .NET Framework
- Instalar .NET Framework 4.8 ou superior

#### C) Verificar Application Pool
- Application Pool deve estar em "No Managed Code"
- Processo deve ser "ApplicationPoolIdentity"

## 🔧 SOLUÇÕES PROGRESSIVAS

### OPÇÃO 1: Web.config Ultra-Básico (ATUAL)
✅ **Arquivo atual**: `web.config`
- Apenas MIME types e documento padrão
- SEM URL Rewrite (funcionará como site estático)
- **Limitação**: Rotas diretas (/dashboard) darão 404

### OPÇÃO 2: Instalar URL Rewrite Module
Se você tem acesso administrativo ao servidor:

1. **Baixar Web Platform Installer**
2. **Instalar "URL Rewrite 2.1"**
3. **Substituir web.config**:
   ```powershell
   copy "web-with-rewrite.config" "web.config"
   ```

### OPÇÃO 3: Usar Hash Router (Alternativa no código)
Se não conseguir instalar URL Rewrite, modificar o Vue Router para usar hash:

**Alterar em `/src/main.js`:**
```javascript
// Mudar de:
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Para:
const router = createRouter({
  history: createWebHashHistory(), // ← Usar hash router
  routes
})
```

## 🧪 TESTE PROGRESSIVO

### 1. Teste Básico
```
https://recebhomolog.mercocamptech.com.br/index.html
```
**Deve funcionar**: ✅ Se der erro 500 = problema de permissões/IIS

### 2. Teste de Rota
```
https://recebhomolog.mercocamptech.com.br/dashboard
```
**Com web.config básico**: ❌ 404 (esperado)
**Com URL Rewrite**: ✅ Deve funcionar

### 3. Teste de Recursos
```
https://recebhomolog.mercocamptech.com.br/assets/main-Db7rEpWg.js
```
**Deve funcionar**: ✅ Se der erro = problema de MIME type

## 🔐 CONFIGURAÇÃO IIS RECOMENDADA

### Application Pool Settings:
- **.NET CLR Version**: No Managed Code
- **Managed Pipeline Mode**: Integrated
- **Identity**: ApplicationPoolIdentity

### Site Settings:
- **Physical Path**: Apontar para pasta `/dist`
- **Default Document**: index.html

## 📞 PRÓXIMOS PASSOS

1. **Testar com web.config atual** (ultra-básico)
2. **Se persistir erro 500**: Problema de IIS/permissões
3. **Se funcionar mas 404 nas rotas**: Instalar URL Rewrite OU usar hash router
4. **Verificar logs do IIS** em: `C:\Windows\System32\LogFiles\W3SVC1\`

---
**📝 Nota**: O web.config atual é a versão mais compatível possível. Se ainda der erro 500, o problema é na configuração do servidor IIS, não no código. 