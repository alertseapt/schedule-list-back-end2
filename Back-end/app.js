const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { testConnections } = require('./config/database');
require('dotenv').config();

const app = express();

// Configurações de segurança
app.use(helmet());

// Configuração do CORS para múltiplas origens
const corsOptions = {
  origin: true, // TEMPORÁRIO: Permitir todas as origens para debug
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept', 'Cache-Control', 'Pragma', 'X-Large-Header']
};

app.use(cors(corsOptions));
app.use(compression());

// Rate limiting - Configuração mais permissiva para desenvolvimento
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 500, // máximo 500 requests por IP (aumentado para desenvolvimento)
  message: {
    error: 'Muitas tentativas. Tente novamente em 5 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Permitir mais tentativas para rotas de autenticação
  skip: (req) => {
    // Pular rate limiting para health check
    return req.path === '/health';
  }
});

// Rate limiting específico para autenticação (mais permissivo)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 1000, // máximo 1000 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 5 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/auth', authLimiter);
app.use('/api/', limiter);

// Middleware para parsing JSON com limites aumentados
app.use(express.json({ 
  limit: '10mb',
  parameterLimit: 50000
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 50000
}));

// Middleware para debug de headers grandes
app.use((req, res, next) => {
  // Calcular tamanho total dos headers
  const headerSize = JSON.stringify(req.headers).length;
  console.log(`📊 Request: ${req.method} ${req.url} - Origin: ${req.headers.origin || 'null'}`);
  console.log(`📏 Tamanho dos headers: ${headerSize} bytes`);
  
  // Mostrar todos os headers para debug
  console.log('🔍 Headers recebidos:');
  Object.entries(req.headers).forEach(([key, value]) => {
    const size = String(value).length;
    const preview = size > 100 ? String(value).substring(0, 100) + '...' : value;
    console.log(`   ${key}: ${preview} (${size} bytes)`);
    
    if (size > 1000) {
      console.warn(`🔴 Header grande: ${key} = ${size} bytes`);
    }
  });
  
  if (headerSize > 8000) {
    console.warn(`⚠️ Headers muito grandes! ${headerSize} bytes`);
  }
  
  next();
});

// Middleware para armazenar a requisição atual em uma variável global
// Isso permite que funções auxiliares acessem o contexto da requisição
app.use((req, res, next) => {
  global.currentRequest = req;
  res.on('finish', () => {
    global.currentRequest = null;
  });
  next();
});

// Importar rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const scheduleRoutes = require('./routes/schedules');
const clientsRoutes = require('./routes/clients');
const userSettingsRoutes = require('./routes/user-settings');
const emailTestRoutes = require('./routes/email-test');
const corpemRoutes = require('./routes/corpem');
const scheduleVerificationRoutes = require('./routes/schedule-verification');
const dpVerificationRoutes = require('./routes/dp-verification');
const dpSchedulerRoutes = require('./routes/dp-scheduler');
const dpStatusMonitoringRoutes = require('./routes/dp-status-monitoring');

// Usar rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/user-settings', userSettingsRoutes);
app.use('/api/email-test', emailTestRoutes);
app.use('/api/corpem', corpemRoutes);
app.use('/api/schedule-verification', scheduleVerificationRoutes);
app.use('/api/dp-verification', dpVerificationRoutes);
app.use('/api/dp-scheduler', dpSchedulerRoutes);
app.use('/api/dp-status-monitoring', dpStatusMonitoringRoutes);

// Rota de health check
app.get('/api/health', async (req, res) => {
  try {
    const dbHealthy = await testConnections();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        dbusers: dbHealthy ? 'connected' : 'disconnected',
        dbcheckin: dbHealthy ? 'connected' : 'disconnected'
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    console.error('Erro no health check:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: {
        dbusers: 'error',
        dbcheckin: 'error'
      },
      error: 'Database connection failed'
    });
  }
});

// Rota de informações da API
app.get('/api/info', (req, res) => {
  res.json({
    name: 'API REST Schedule Mercocamp',
    version: '1.0.0',
    description: 'API para comunicação com bancos de dados Heidi do Mercocamp',
    databases: {
      dbusers: {
        description: 'Banco de dados de usuários',
        tables: ['users']
      },
      dbcheckin: {
        description: 'Banco de dados de check-in e produtos',
        tables: ['products', 'schedule_list']
      }
    },
    endpoints: {
      authentication: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      schedules: '/api/schedules'
    },
    features: [
      'Autenticação JWT',
      'Controle de acesso por nível (0=user, 1=admin, 2=manager)',
      'Controle de acesso por cliente (cli_access)',
      'Gerenciamento de usuários',
      'Gerenciamento de produtos/relacionamentos cliente-fornecedor',
      'Gerenciamento de agendamentos com histórico',
      'Validação de dados',
      'Rate limiting',
      'Logs de auditoria'
    ]
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'API REST Schedule Mercocamp',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/info'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: 'A rota solicitada não existe nesta API'
  });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  
  // Erro de validação do Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.details.map(detail => detail.message)
    });
  }
  
  // Erro de JSON malformado
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'JSON inválido',
      message: 'Verifique a sintaxe do JSON enviado'
    });
  }
  
  // Erro genérico
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: 'Algo deu errado. Tente novamente mais tarde.'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Configurar limites do Node.js antes de iniciar
    process.env.UV_THREADPOOL_SIZE = 128;
    
    // Interceptar requisições HTTP para debug
    const http = require('http');
    const originalCreateServer = http.createServer;
    
    console.log('🔧 Configurando interceptor de requisições HTTP...');
    
    // Testar conexões com os bancos de dados
    console.log('🔄 Testando conexões com os bancos de dados...');
    const dbHealthy = await testConnections();
    
    if (!dbHealthy) {
      console.error('❌ Falha na conexão com os bancos de dados');
      console.log('⚠️  MODO DE DESENVOLVIMENTO: Iniciando servidor sem banco de dados');
      console.log('📧 Sistema de e-mail disponível para testes');
      console.log('🚫 Funcionalidades que dependem do banco estarão indisponíveis');
    } else {
      console.log('✅ Conexões com os bancos de dados estabelecidas');
      
      // ===== INICIALIZAÇÃO DE SERVIÇOS =====
      
      // DP Scheduler Service - Busca automática de DP
      console.log('🚀 Inicializando serviço de agendamento de busca de DP...');
      const dpSchedulerService = require('./services/dpSchedulerService');
      
      // DP Status Monitoring Service - Monitoramento de situação DP
      console.log('🚀 Inicializando serviço de monitoramento de status DP...');
      const DPStatusMonitoringService = require('./services/dpStatusMonitoringService');
      const dpStatusService = new DPStatusMonitoringService();
      
      setTimeout(() => {
        console.log('🔍 Iniciando DPSchedulerService...');
        dpSchedulerService.start();
        console.log('✅ DPSchedulerService iniciado automaticamente');
        console.log('📊 Busca de DP: 5 min após criação, repete a cada 5 min, máx 10 tentativas');
        console.log('🗃️ Consultando dados em dbmercocamp.wtr');
        
        console.log('🔍 Iniciando DPStatusMonitoringService...');
        dpStatusService.start();
        console.log('✅ DPStatusMonitoringService iniciado automaticamente');
        console.log('📊 Monitoramento: verifica situação "Fechado" a cada 30s');
        console.log('🗃️ Atualiza status para "Em estoque" automaticamente');
      }, 5000); // Aguardar 5 segundos para garantir que as conexões estejam prontas
    }
    
    // Iniciar servidor com configurações HTTP aumentadas
    const server = app.listen(PORT, () => {
      console.log('\n🚀 Servidor iniciado com sucesso!');
      console.log(`📡 Porta: ${PORT}`);
      console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📚 Documentação: http://localhost:${PORT}/api/info`);
      console.log('\n📋 Estrutura dos bancos de dados:');
      console.log('   📊 dbusers.users: Sistema de usuários com níveis de acesso');
      console.log('   📊 dbcheckin.products: Relacionamentos cliente-fornecedor');
      console.log('   📊 dbcheckin.schedule_list: Agendamentos de entrega/NFe');
      console.log('   📊 dbmercocamp.wtr: Tabela com números de DP');
      console.log('\n🔐 Credenciais de teste:');
      console.log('   👑 president/president (nível 1 - admin)');
      console.log('   🛠️  dev/dev (nível 0 - usuário)');
      console.log('   👨‍💼 manager/manager (nível 2 - gerente)');
      console.log('\n📚 Endpoints disponíveis:');
      console.log('   🔑 POST /api/auth/login - Login');
      console.log('   🔑 POST /api/auth/register - Registrar usuário');
      console.log('   👥 GET /api/users - Listar usuários');
      console.log('   📦 GET /api/products - Listar produtos/relacionamentos');
      console.log('   📅 GET /api/schedules - Listar agendamentos');
      console.log('   🔍 GET /api/dp-verification/status - Status verificação DP');
      console.log('   🏥 GET /api/health - Status da API');
    });
    
    // Configurar limites do servidor HTTP
    server.maxHeadersCount = 0; // Sem limite de headers
    server.headersTimeout = 120000; // 2 minutos
    server.keepAliveTimeout = 65000; // 65 segundos
    server.maxHeaderSize = 65536; // 64KB para headers
    
    // Handler para erro 431 e outros erros de conexão
    server.on('clientError', (err, socket) => {
      console.error('🔴 Erro do cliente:', err.message);
      console.error('🔍 Código do erro:', err.code);
      console.error('🔍 Stack:', err.stack);
      
      if (err.code === 'HPE_HEADER_OVERFLOW') {
        console.error('❌ Headers muito grandes detectados!');
        console.error('📊 Limite atual: 64KB');
        
        // Tentar extrair informações do socket
        if (socket.parser && socket.parser.incoming) {
          const req = socket.parser.incoming;
          console.error('🔍 URL da requisição:', req.url);
          console.error('🔍 Método:', req.method);
          if (req.headers) {
            console.error('🔍 Headers parciais capturados:');
            Object.entries(req.headers).forEach(([key, value]) => {
              const size = String(value).length;
              console.error(`   ${key}: ${size} bytes`);
              if (size > 1000) {
                console.error(`     Preview: ${String(value).substring(0, 200)}...`);
              }
            });
          }
        }
        
        socket.end('HTTP/1.1 431 Request Header Fields Too Large\r\n' +
                   'Access-Control-Allow-Origin: *\r\n' +
                   'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n' +
                   'Access-Control-Allow-Headers: Content-Type, Authorization\r\n' +
                   '\r\n' +
                   'Headers too large');
      } else {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      }
    });
    
    server.on('error', (err) => {
      console.error('🔴 Erro do servidor:', err);
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM recebido, encerrando servidor...');
  
  // Parar serviço de verificação de DP - TEMPORARIAMENTE DESABILITADO
  // dpVerificationService.stop();
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT recebido, encerrando servidor...');
  
  // Parar serviço de verificação de DP - TEMPORARIAMENTE DESABILITADO  
  // dpVerificationService.stop();
  
  process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;