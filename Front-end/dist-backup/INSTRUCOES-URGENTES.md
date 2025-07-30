# 🚨 INSTRUÇÕES URGENTES - ERRO 500 PERSISTENTE

## ⚠️ DIAGNÓSTICO: Problema no Servidor IIS

O erro 500 persiste mesmo com `web.config` ultra-básico. **Isso confirma que o problema NÃO é no código, mas sim na configuração do servidor IIS.**

## 🧪 TESTE IMEDIATO

**PRIMEIRO, TESTE ESTA URL:**
```
https://recebhomolog.mercocamptech.com.br/test.html
```

### ✅ Se `test.html` FUNCIONAR:
- ✅ IIS está funcionando
- ✅ Servidor pode servir HTML estático
- ❌ Problema específico com a aplicação Vue

### ❌ Se `test.html` der ERRO 500:
- ❌ Problema grave na configuração do IIS
- ❌ Permissões bloqueadas
- ❌ Application Pool mal configurado

## 🔧 SOLUÇÕES URGENTES

### SOLUÇÃO 1: Substituir web.config por versão vazia
```powershell
# No servidor, executar:
copy "web-empty.config" "web.config"
```

### SOLUÇÃO 2: Verificar permissões (CRÍTICO)
```powershell
# Dar permissões completas para IIS_IUSRS:
icacls "C:\caminho\para\pasta\dist" /grant IIS_IUSRS:(OI)(CI)F /T
```

### SOLUÇÃO 3: Verificar Application Pool
**No IIS Manager:**
1. Clicar no Application Pool do site
2. **Actions** → **Advanced Settings**
3. Configurar:
   - **.NET CLR Version**: `No Managed Code`
   - **Managed Pipeline Mode**: `Integrated`
   - **Identity**: `ApplicationPoolIdentity`
4. **Actions** → **Recycle**

### SOLUÇÃO 4: Aumentar limites de arquivo
Adicionar no `web.config`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="52428800" />
      </requestFiltering>
    </security>
    <defaultDocument>
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>
  </system.webServer>
</configuration>
```

## 📊 TESTE PROGRESSIVO

### 1. Teste Básico
```
https://recebhomolog.mercocamptech.com.br/test.html
```
**Esperado**: ✅ Página de diagnóstico carrega

### 2. Teste de Recursos Estáticos
```
https://recebhomolog.mercocamptech.com.br/assets/logo-DeMe0Qxk.png
```
**Esperado**: ✅ Imagem carrega

### 3. Teste da Aplicação
```
https://recebhomolog.mercocamptech.com.br/index.html
```
**Esperado**: ✅ Aplicação Vue carrega

## 🚨 SE NADA FUNCIONAR

### Verificar Logs do IIS
**Localização dos logs:**
```
C:\Windows\System32\LogFiles\W3SVC1\
```

**Procurar por:**
- Status Code: 500
- Substatus: (importante para diagnóstico)
- Win32 Status: (código de erro Windows)

### Códigos de Erro Comuns
- **500.0**: Erro interno genérico
- **500.19**: Erro de configuração (web.config inválido)
- **500.21**: Módulo não carregado
- **500.24**: Problema ASP.NET

## 📞 AÇÃO IMEDIATA RECOMENDADA

1. **TESTE**: Acesse `test.html` primeiro
2. **SE FUNCIONAR**: Problema na aplicação Vue (permissões/tamanho)
3. **SE NÃO FUNCIONAR**: Problema grave no IIS (chamar administrador)
4. **VERIFICAR LOGS**: Sempre verificar logs para código específico
5. **PERMISSÕES**: Aplicar comando `icacls` imediatamente

---
**⚡ CRÍTICO**: O erro 500 com web.config vazio indica problema de infraestrutura, não de código! 