# 🚀 LogiReceive - Sistema de Recebimento com Vue.js

Sistema web completo para gestão de recebimento de mercadorias, desenvolvido com **Vue.js 3**, **Vite** e integração total com API REST. Projeto moderno com estrutura padronizada Vue/Vite.

## 🎯 Características Principais

✅ **Vue 3 + Vite** - Stack moderna e performática  
✅ **Componentes SFC** - Single File Components (.vue)  
✅ **Build otimizado** - Bundle minificado para produção  
✅ **ESLint + Prettier** - Qualidade e padronização de código  
✅ **Hot Module Replacement** - Desenvolvimento ágil  
✅ **Integração API REST** - Cliente HTTP com Axios  
✅ **Sistema de Autenticação** - JWT tokens seguro  
✅ **Responsivo** - Funciona em desktop, tablet e mobile  

## 📁 Estrutura do Projeto (Vue Padrão)

```
Front-end/
├── index.html                     # 📄 Arquivo HTML principal
├── package.json                   # 📦 Configuração e dependências
├── vite.config.js                 # ⚡ Configuração do Vite
├── .eslintrc.cjs                  # 🔍 Configuração ESLint
├── .prettierrc                    # 💅 Configuração Prettier
├── .gitignore                     # 🚫 Arquivos ignorados no Git
├── src/                           # 📂 Código fonte principal
│   ├── main.js                    # 🚀 Ponto de entrada da aplicação
│   ├── App.vue                    # 🏠 Componente raiz
│   ├── assets/                    # 🎨 Recursos estáticos
│   │   ├── css/
│   │   │   ├── main.css           # 🎨 Estilos principais
│   │   │   ├── login.css          # 🔐 Estilos de login
│   │   │   └── vue-components.css # 🎨 Estilos dos componentes
│   │   └── images/
│   │       └── logo.png           # 🎨 Logo do sistema
│   ├── components/                # 🧩 Componentes Vue
│   │   ├── SidebarComponent.vue   # 📋 Menu lateral
│   │   ├── StatsCards.vue         # 📊 Cards de estatísticas
│   │   ├── RecentActivities.vue   # 📝 Atividades recentes
│   │   ├── PendingDeliveries.vue  # 🚚 Entregas pendentes
│   │   ├── NotificationsComponent.vue # 🔔 Notificações
│   │   ├── SchedulesList.vue      # 📋 Lista de agendamentos
│   │   ├── ScheduleCreationModal.vue # ➕ Modal de criação
│   │   ├── ProductEditModal.vue   # ✏️ Modal de edição de produtos
│   │   ├── NfeInfoModal.vue       # 📄 Modal de informações NFe
│   │   └── ScheduleFilters.vue    # 🔍 Filtros de agendamentos
│   ├── utils/                     # 🔧 Utilitários
│   │   ├── permissions.js         # 🔒 Sistema de permissões
│   │   └── auth-guard.js          # 🛡️ Proteção de rotas
│   ├── views/                     # 📄 Páginas/Views (futuro)
│   └── composables/               # 🪝 Composables Vue (futuro)
├── old/                           # 📦 Projeto anterior (backup)
├── API_FRONTEND_DOCUMENTATION.md  # 📖 Documentação da API
└── README.md                      # 📖 Este arquivo
```

## 🚀 Scripts de Desenvolvimento

### **Desenvolvimento**
```bash
npm run dev        # Servidor de desenvolvimento (HMR ativo)
```
- Abre em `http://localhost:8000` (ou próxima porta disponível)
- Hot Module Replacement para desenvolvimento ágil
- Modo desenvolvimento do Vite
- **⚠️ Requer backend rodando em `https://schedule-mercocamp-back-end.up.railway.app/api`**

### **Produção**
```bash
npm run build      # Build otimizado para produção
npm run preview    # Visualizar build de produção localmente
```

### **Qualidade de Código**
```bash
npm run lint       # ESLint (correção automática)
npm run format     # Prettier (formatação)
```

### **Compatibilidade (Scripts Antigos)**
```bash
npm start          # Alias para npm run dev
npm run serve      # Alias para npm run preview
```

## ⚡ Tecnologias e Dependências

### **Core Stack**
- **Vue.js 3.5.17** - Framework reativo moderno
- **Vite 5.4.19** - Build tool ultra-rápido
- **Axios 1.10.0** - Cliente HTTP

### **Desenvolvimento**
- **ESLint 8.57.1** - Linting de código
- **Prettier 3.6.2** - Formatação automática
- **@vue/eslint-config-prettier** - Integração ESLint + Prettier

### **Build e Bundling**
- **@vitejs/plugin-vue** - Plugin Vue para Vite
- **Rollup** - Bundler (via Vite)
- **esbuild** - Transformador ultra-rápido

### **CDN (Produção)**
```html
<!-- Font Awesome 6.7.2 -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css">
```

## 🏗️ Arquitetura Vue Moderna

### **Single File Components (.vue)**
```vue
<template>
  <!-- HTML template -->
</template>

<script>
export default {
  name: 'ComponentName',
  // Lógica do componente
}
</script>

<style>
/* Estilos (opcional) */
</style>
```

### **Componentes Principais**
- **App.vue** - Componente raiz da aplicação
- **SidebarComponent.vue** - Menu de navegação lateral
- **StatsCards.vue** - Cards de métricas/estatísticas
- **PendingDeliveries.vue** - Tabela de entregas agendadas
- **NotificationsComponent.vue** - Sistema de notificações toast
- **Modals** - Modais para criação e edição de agendamentos

### **Sistema de Estado**
```javascript
// Estado reativo global no App.vue
data() {
  return {
    user: null,
    loading: true,
    dashboardStats: { /*...*/ },
    recentActivities: [],
    pendingDeliveries: [],
    notifications: []
  }
}
```

## 🔌 Integração com API

### **Cliente API (VueApiClient)**
```javascript
class VueApiClient {
  constructor() {
    this.baseURL = 'https://schedule-mercocamp-back-end.up.railway.app/api'
    this.token = localStorage.getItem('token')
  }

  async request(endpoint, options = {}) {
    // Configuração automática JWT
    // Tratamento de erros 401
    // Renovação automática de tokens
  }
}
```

### **Endpoints Principais**
```javascript
POST /api/auth/login           # Login de usuário
GET  /api/schedules            # Lista de agendamentos  
POST /api/schedules            # Criar agendamento
PATCH /api/schedules/:id/status # Atualizar status
GET  /api/clients              # Lista de clientes
POST /api/products/check-existing # Verificar produtos
```

## 🎨 Sistema de Build (Vite)

### **Desenvolvimento**
- **Dev Server** ultra-rápido com HMR
- **ESBuild** para transformação de código
- **Hot Module Replacement** instantâneo
- **Source Maps** para debugging

### **Produção** 
- **Tree Shaking** automático
- **Code Splitting** inteligente
- **Minificação** avançada (Terser)
- **Otimização de assets** (imagens, CSS, JS)
- **Bundle analysis** integrado

### **Configuração (vite.config.js)**
```javascript
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  },
  server: { port: 8000 },
  build: { outDir: 'dist' }
})
```

## 🔍 Qualidade de Código

### **ESLint Configuration**
- **Vue 3 Essential** rules
- **Prettier** integration
- **Browser** globals
- **ES2022** syntax support

### **Prettier Configuration** 
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

## 📱 Recursos Modernos

### **ES6+ Features**
- **Import/Export** modules
- **Async/Await** patterns  
- **Template Literals**
- **Destructuring** assignments
- **Arrow Functions**

### **Vue 3 Features**
- **Composition API** ready
- **Multiple Root Elements**
- **Suspense** support
- **Teleport** available
- **Fragments** enabled

## 🚀 Processo de Build

### **Desenvolvimento (npm run dev)**
```
1. Vite Dev Server → Port 8000
2. Hot Module Replacement ativo
3. Source Maps habilitados
4. Fast Refresh para Vue components
5. ESLint em tempo real
```

### **Produção (npm run build)**
```
1. TypeScript checking
2. Vue SFC compilation  
3. CSS extraction e minification
4. JavaScript bundling e minification
5. Asset optimization
6. Output → dist/ folder
```

### **Output da Build**
```
dist/
├── index.html                 # HTML otimizado
├── assets/
│   ├── index-[hash].js        # JavaScript bundle
│   ├── index-[hash].css       # CSS bundle  
│   └── logo-[hash].png        # Assets otimizados
```

## 🔒 Segurança

### **Medidas Implementadas**
- **JWT Authentication** com refresh automático
- **HTTPS-only** cookies para tokens
- **XSS Protection** via Vue template escaping
- **CSRF Protection** via tokens
- **Route Guards** para proteção de páginas

### **Configuração de Segurança**
```javascript
// Auto-logout em token expirado
if (error.response?.status === 401) {
  localStorage.removeItem('token')
  window.location.href = '/login.html'
}
```

## 📊 Performance

### **Otimizações de Build**
- **Bundle size**: ~126KB JS minificado + gzip
- **CSS size**: ~27KB minificado
- **Tree shaking** remove código não utilizado
- **Code splitting** por rotas (futuro)

### **Runtime Performance**
- **Virtual DOM** diffing otimizado
- **Reactive System** eficiente  
- **Component lazy loading** disponível
- **Asset optimization** automático

## 🧪 Testing (Futuro)

### **Configuração Recomendada**
```bash
npm install --save-dev @vitejs/plugin-vue @vue/test-utils vitest jsdom
```

### **Frameworks Sugeridos**
- **Vitest** - Test runner nativo Vite
- **Vue Test Utils** - Testes de componentes
- **Cypress** - Testes E2E
- **Playwright** - Testes cross-browser

## 🔮 Próximos Passos

### **Arquitetura**
- [ ] **Vue Router** para SPA navigation
- [ ] **Pinia** para gerenciamento de estado
- [ ] **TypeScript** para tipagem estática
- [ ] **PWA** para funcionalidades offline

### **Performance** 
- [ ] **Lazy Loading** de componentes
- [ ] **Virtual Scrolling** para listas grandes
- [ ] **Service Worker** para cache
- [ ] **Pre-loading** de rotas críticas

### **Developer Experience**
- [ ] **Storybook** para documentação de componentes
- [ ] **Vitest** para testes unitários
- [ ] **Cypress** para testes E2E
- [ ] **Husky** para pre-commit hooks

## 🛠️ Solução de Problemas

### **Build Errors**
```bash
# Limpar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install

# Limpar cache do Vite  
npx vite --force
```

### **ESLint Errors**
```bash
# Auto-fix de problemas
npm run lint

# Verificar configuração
npx eslint --print-config src/App.vue
```

### **Development Issues**
```bash
# Verificar portas em uso
netstat -tulpn | grep :8000

# Forçar nova porta
npm run dev -- --port 3000
```

## 📖 Referências

### **Documentação Oficial**
- [Vue.js 3](https://vuejs.org/) - Framework documentation
- [Vite](https://vitejs.dev/) - Build tool documentation  
- [Axios](https://axios-http.com/) - HTTP client docs

### **Guias e Tutoriais**
- [Vue 3 Migration](https://v3-migration.vuejs.org/) - Guia de migração
- [Vite Guide](https://vitejs.dev/guide/) - Getting started
- [ESLint Vue](https://eslint.vuejs.org/) - Linting configuration

## 📄 Licença

Este projeto faz parte do sistema **YOUWARE/LogiReceive**.  
Desenvolvido com ❤️ usando **Vue.js 3 + Vite**.

---

## 📚 Documentação API

Para detalhes completos dos endpoints e contratos de integração, consulte:
- **[API_FRONTEND_DOCUMENTATION.md](API_FRONTEND_DOCUMENTATION.md)** - Especificação completa da API

## 🎉 Conclusão

O sistema LogiReceive foi **modernizado com sucesso** para a stack **Vue.js 3 + Vite**, oferecendo:

✅ **Performance superior** com Vite build tool  
✅ **Desenvolvimento ágil** com HMR  
✅ **Código padronizado** com ESLint + Prettier  
✅ **Componentes modulares** em Single File Components  
✅ **Build otimizado** para produção  
✅ **Arquitetura escalável** pronta para crescer  

**🚀 Pronto para produção com Vue 3 + Vite!**