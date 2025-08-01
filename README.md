# Schedule Mercocamp

Sistema de agendamento e gerenciamento de entregas para a Mercocamp.

## 📁 Estrutura do Projeto

```
Schedule-mercocamp/
├── Back-end/                 # API Node.js/Express
│   ├── app.js               # Aplicação principal
│   ├── config/              # Configurações do banco de dados
│   ├── middleware/          # Middlewares de autenticação e validação
│   ├── routes/              # Rotas da API
│   ├── services/            # Serviços de negócio
│   ├── sql/                 # Scripts SQL
│   └── package.json
├── Front-end/               # Aplicação Vue.js
│   ├── src/                 # Código fonte
│   │   ├── components/      # Componentes Vue
│   │   ├── views/           # Páginas
│   │   ├── assets/          # Recursos estáticos
│   │   └── main.js          # Entrada da aplicação
│   ├── index.html           # Página principal
│   └── package.json
├── docs/                    # Documentação organizada
│   ├── api/                 # Documentação da API
│   ├── backend/             # Documentação do back-end
│   ├── frontend/            # Documentação do front-end
│   └── examples/            # Exemplos e arquivos de teste
└── README.md               # Este arquivo
```

## 🚀 Como Executar

### Back-end
```bash
cd Back-end
npm install
npm start
```

### Front-end
```bash
cd Front-end
npm install
npm run dev
```

## 📚 Documentação

- **API**: `docs/api/` - Documentação da API e integrações
- **Back-end**: `docs/backend/` - Documentação técnica do servidor
- **Front-end**: `docs/frontend/` - Documentação da interface
- **Exemplos**: `docs/examples/` - Arquivos de exemplo e testes

## 🛠️ Tecnologias

- **Back-end**: Node.js, Express, MySQL
- **Front-end**: Vue.js 3, Vite
- **Autenticação**: JWT
- **Estilização**: CSS customizado

## 📝 Histórico de Implementação

Consulte `docs/HISTORICO_IMPLEMENTACAO.md` para detalhes sobre o desenvolvimento do projeto. 