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

// Middleware para logging simplificado
app.use((req, res, next) => {
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
    
    
    const dbHealthy = await testConnections();
    
    if (dbHealthy) {
      console.log('✅ Conexões com os bancos de dados estabelecidas');
      
      // Inicializar serviços
      const dpSchedulerService = require('./services/dpSchedulerService');
      const DPStatusMonitoringService = require('./services/dpStatusMonitoringService');
      const dpStatusService = new DPStatusMonitoringService();
      
      setTimeout(() => {
        dpSchedulerService.start();
        dpStatusService.start();
        console.log('✅ Serviços de monitoramento iniciados');
      }, 5000);
    } else {
      console.error('❌ Falha na conexão com os bancos de dados');
    }
    
    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado na porta ${PORT}`);
    });
    
    // Configurar limites do servidor HTTP
    server.maxHeadersCount = 0; // Sem limite de headers
    server.headersTimeout = 120000; // 2 minutos
    server.keepAliveTimeout = 65000; // 65 segundos
    server.maxHeaderSize = 65536; // 64KB para headers
    
    // Handler para erro 431 e outros erros de conexão
    server.on('clientError', (err, socket) => {
      if (err.code === 'HPE_HEADER_OVERFLOW') {
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
  process.exit(0);
});

process.on('SIGINT', () => {
  process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;