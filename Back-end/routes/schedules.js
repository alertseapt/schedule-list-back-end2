const express = require('express');
const { executeCheckinQuery, executeUsersQuery, executeMercocampQuery } = require('../config/database');
const { validate, paramSchemas, nfeSchemas, validateCNPJ, formatCNPJ } = require('../middleware/validation');
const { authenticateToken, requireAdmin, requireManager, requireClientAccess, checkClientAccess } = require('../middleware/auth');
const emailService = require('../services/emailService');
const { triggerProductsIntegration, triggerNfEntryIntegration } = require('./corpem');
const productService = require('../services/productService');
const DPVerificationServiceOptimized = require('../services/dpVerificationServiceOptimized');
const DPVerificationServiceWithDate = require('../services/dpVerificationServiceWithDate');
const multer = require('multer');
const xml2js = require('xml2js');
const Joi = require('joi');

const router = express.Router();

// Configuração do multer para upload de arquivos XML
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || file.originalname.endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos XML são permitidos'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rota específica para verificar duplicidade de NFe (PRIMEIRA ETAPA)
router.post('/check-duplicate', async (req, res) => {
  try {
    const { nfe_key } = req.body;
    
    if (!nfe_key) {
      return res.status(400).json({
        success: false,
        message: 'Chave NFe é obrigatória'
      });
    }
    
    const cleanNfeKey = nfe_key.toString().trim().replace(/[^\d]/g, '');
    
    const existingSchedules = await executeCheckinQuery(
      'SELECT id, nfe_key, status, client, number FROM schedule_list WHERE REPLACE(REPLACE(nfe_key, " ", ""), "-", "") = ?',
      [cleanNfeKey]
    );
    
    if (existingSchedules.length > 0) {
      const activeSchedules = existingSchedules.filter(schedule => 
        schedule.status !== 'Cancelado' && schedule.status !== 'Recusado'
      );
      
      if (activeSchedules.length > 0) {
        const activeSchedule = activeSchedules[0];
        
        return res.status(409).json({
          success: false,
          message: `Esta NFe já possui um agendamento ativo (Status: ${activeSchedule.status}). Não é possível criar um novo agendamento.`,
          existing_schedule: {
            id: activeSchedule.id,
            number: activeSchedule.number,
            status: activeSchedule.status,
            client: activeSchedule.client
          }
        });
      }
    }
    
    return res.json({
      success: true,
      message: 'NFe pode ser agendada'
    });
    
  } catch (error) {
    console.error('❌ Erro na verificação de duplicidade:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao verificar duplicidade',
      error: error.message
    });
  }
});


// Schemas de validação para agendamentos (estrutura real: schedule_list)
const scheduleSchemas = {
  create: Joi.object({
    number: Joi.string().pattern(/^\d{1,10}$/).required(),
    nfe_key: Joi.string().max(44).required(),
    client: Joi.string().min(1).max(100).required(), // Allow client name/CNPJ, more flexible than 14 chars
    case_count: Joi.number().integer().min(0).required(),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    status: Joi.string().max(20).valid('Solicitado', 'Contestado', 'Agendado', 'Conferência', 'Tratativa', 'Estoque', 'Recusar', 'Cancelar', 'Recusado', 'Cancelado').default('Solicitado'),
    historic: Joi.object().default({}),
    supplier: Joi.string().max(50).required(),
    qt_prod: Joi.number().integer().min(0).required(),
    info: Joi.object().default({}),
    observations: Joi.string().allow('', null).optional() // Add observations field
  }),

  update: Joi.object({
    number: Joi.string().pattern(/^\d{1,10}$/),
    nfe_key: Joi.string().max(44),
    client: Joi.string().min(1).max(100), // Allow client name/CNPJ, more flexible than 14 chars
    case_count: Joi.number().integer().min(0),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    status: Joi.string().max(20).valid('Solicitado', 'Contestado', 'Agendado', 'Conferência', 'Tratativa', 'Estoque', 'Recusar', 'Cancelar', 'Recusado', 'Cancelado'),
    historic: Joi.object(),
    supplier: Joi.string().max(50),
    qt_prod: Joi.number().integer().min(0),
    info: Joi.object(),
    observations: Joi.string().allow('', null).optional() // Add observations field
  }).min(1),

  updateStatus: nfeSchemas.updateStatus,
  createWithProducts: nfeSchemas.createWithProducts
};

// Função auxiliar para verificar se o usuário tem acesso ao cliente
// Usa a função checkClientAccess do middleware auth.js que implementa cache
const hasClientAccess = (userCliAccess, clientCnpj) => {
  // Se não estamos em um contexto de requisição, usamos a verificação direta
  if (!global.currentRequest || !global.currentRequest.user) {
  if (!userCliAccess || typeof userCliAccess !== 'object') return false;
  return Object.keys(userCliAccess).includes(clientCnpj);
  }
  
  // Se estamos em um contexto de requisição, usamos a função com cache
  return checkClientAccess(global.currentRequest, clientCnpj);
};

// Função auxiliar para buscar informações do cliente no cli_access do usuário logado
const getClientInfo = async (clientCnpj, userCliAccess = null) => {
  try {
    // Se foi passado o cli_access do usuário logado, usar ele primeiro
    if (userCliAccess) {
      if (userCliAccess[clientCnpj]) {
        const clientData = userCliAccess[clientCnpj];
        
        const result = {
          cnpj: clientCnpj,
          name: clientData.nome || `Cliente ${clientCnpj}`,
          number: clientData.numero || clientCnpj,
          source: 'user_cli_access',
          cli_access_data: clientData
        };
        
        return result;
      }
    }
    
    // Se não encontrou no usuário logado, buscar em todos os usuários
    const users = await executeUsersQuery(
      'SELECT cli_access FROM users WHERE cli_access IS NOT NULL'
    );
    
    for (const user of users) {
      const cliAccess = typeof user.cli_access === 'string' ? 
        JSON.parse(user.cli_access) : user.cli_access;
      
      if (cliAccess[clientCnpj]) {
        const clientData = cliAccess[clientCnpj];
        const result = {
          cnpj: clientCnpj,
          name: clientData.nome || `Cliente ${clientCnpj}`,
          number: clientData.numero || clientCnpj,
          source: 'cli_access',
          cli_access_data: clientData
        };
        
        return result;
      }
    }
    
    // Se não encontrar em lugar nenhum, retornar dados básicos
    return {
      cnpj: clientCnpj,
      name: `Cliente ${clientCnpj}`,
      number: clientCnpj,
      source: 'fallback'
    };
  } catch (error) {
    console.error('Erro ao buscar informações do cliente:', error);
    return {
      cnpj: clientCnpj,
      name: `Cliente ${clientCnpj}`,
      number: clientCnpj,
      source: 'error'
    };
  }
};

// Função auxiliar para validar CNPJ na tabela wcl (apenas para validação)
const validateClientInWcl = async (clientCnpj) => {
  try {
    // Tenta buscar o CNPJ nas duas formas: com e sem formatação
    const formattedCnpj = formatCNPJ(clientCnpj);
    const clientExists = await executeMercocampQuery(
      'SELECT cnpj_cpf FROM wcl WHERE cnpj_cpf = ? OR cnpj_cpf = ? LIMIT 1',
      [clientCnpj, formattedCnpj]
    );
    
    if (clientExists.length > 0) {
      return {
        exists: true,
        data: clientExists[0]
      };
    }
    
    return {
      exists: false,
      data: null
    };
  } catch (error) {
    console.error('Erro ao validar cliente na tabela wcl:', error);
    return {
      exists: false,
      data: null,
      error: error.message
    };
  }
};

// Listar agendamentos (com filtro por cli_access)
router.get('/', async (req, res) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado'
      });
    }
    
    const { 
      page = 1, 
      limit = 10, 
      client = '', 
      status = '',
      date_from = '',
      date_to = '',
      nfe_key = '',
      number = '',
      supplier = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    // Filtrar por acesso do usuário baseado no nível de permissão
    const shouldFilterByCliAccess = !req.user._clientAccessCache.hasFullAccess;
    
    if (shouldFilterByCliAccess) {
      const allowedClients = req.user._clientAccessCache.allowedClients;
      
      if (allowedClients.length === 0) {
        return res.json({
          schedules: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
      
      // Normalizar CNPJs: criar array com versões com e sem formatação
      const normalizedClients = [];
      allowedClients.forEach(cnpj => {
        normalizedClients.push(cnpj);
        normalizedClients.push(cnpj.replace(/[^\d]/g, ''));
        const formatted = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        if (formatted !== cnpj) {
          normalizedClients.push(formatted);
        }
      });
      
      const uniqueClients = [...new Set(normalizedClients)];
      
      whereClause += ` AND client IN (${uniqueClients.map(() => '?').join(',')})`;
      params.push(...uniqueClients);
    }

    // Filtros adicionais
    if (client) {
      whereClause += ' AND client = ?';
      params.push(client);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (date_from) {
      whereClause += ' AND date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND date <= ?';
      params.push(date_to);
    }

    if (nfe_key) {
      whereClause += ' AND nfe_key = ?';
      params.push(nfe_key);
    }

    if (number) {
      whereClause += ' AND number = ?';
      params.push(number);
    }

    if (supplier) {
      whereClause += ' AND supplier LIKE ?';
      params.push(`%${supplier}%`);
    }

    // Buscar agendamentos na tabela schedule_list do dbcheckin
    const schedules = await executeCheckinQuery(
      `SELECT 
        id, number, nfe_key, client, date, status, historic, supplier, qt_prod, info, case_count, no_dp
       FROM schedule_list 
       ${whereClause}
       ORDER BY date DESC, id DESC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      params
    );

    // Processar dados de retorno
    const processedSchedules = await Promise.all(schedules.map(async (schedule) => {
      const clientInfo = await getClientInfo(schedule.client, req.user.cli_access);
      
      // Extrair informações do JSON info se disponível
      let supplierName = schedule.supplier;
      if (schedule.info && typeof schedule.info === 'string') {
        try {
          const info = JSON.parse(schedule.info);
          if (info.emit && info.emit.xNome) {
            supplierName = info.emit.xNome;
          }
        } catch (e) {
          // Se não conseguir parsear, mantém o supplier original
        }
      } else if (schedule.info && schedule.info.emit && schedule.info.emit.xNome) {
        supplierName = schedule.info.emit.xNome;
      }

      // Extrair total_value do info se disponível
      let totalValue = null;
      let parsedInfo = null;
      
      if (schedule.info) {
        try {
          parsedInfo = typeof schedule.info === 'string' ? 
            JSON.parse(schedule.info) : schedule.info;
          
          // Buscar valor total na estrutura correta do XML: total.ICMSTot.vProd
          if (parsedInfo.total && parsedInfo.total.ICMSTot) {
            totalValue = parsedInfo.total.ICMSTot.vProd || parsedInfo.total.ICMSTot.vNF || null;
          } else {
            // Fallback: calcular somando todos os produtos
            if (parsedInfo.products && Array.isArray(parsedInfo.products)) {
              totalValue = parsedInfo.products.reduce((sum, product) => {
                return sum + (product.total_value || 0);
              }, 0);
            } else {
              totalValue = null;
            }
          }
          
        } catch (e) {
          parsedInfo = schedule.info;
        }
      }

      const result = {
          id: schedule.id,
          number: schedule.number,
          nfe_key: schedule.nfe_key,
          client: clientInfo.name,
          client_cnpj: schedule.client,
          supplier: supplierName,
          case_count: schedule.case_count || 0,
          status: schedule.status,
          date: schedule.date instanceof Date ? 
            `${schedule.date.getFullYear()}-${String(schedule.date.getMonth() + 1).padStart(2, '0')}-${String(schedule.date.getDate()).padStart(2, '0')}` : 
            schedule.date,
          qt_prod: schedule.qt_prod,
          total_value: totalValue,
          no_dp: schedule.no_dp || null, // Número do Documento de Portaria
          historic: typeof schedule.historic === 'string' ? 
            JSON.parse(schedule.historic) : schedule.historic,
          info: parsedInfo,
          client_info: clientInfo
        };
        
        return result;
    }));

    // Contar total
    const [{ total }] = await executeCheckinQuery(
      `SELECT COUNT(*) as total FROM schedule_list ${whereClause}`,
      params
    );

    res.json({
      schedules: processedSchedules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// O endpoint de criação de agendamento já aceita JSON parseado em /create-with-products, então apenas garanta que a documentação e exemplos estejam claros para o frontend.

// Verificar se CNPJ precisa de estoque obrigatório
router.post('/check-cnpj-requirements', async (req, res) => {
  try {
    const { cnpj } = req.body;
    
    if (!cnpj) {
      return res.status(400).json({
        error: 'CNPJ é obrigatório'
      });
    }
    
    // Verificar se CNPJ existe no WCL
    const wclValidation = await validateClientInWcl(cnpj);
    
    // Usuários nível 0 têm acesso total
    if (req.user._clientAccessCache.hasFullAccess) {
      return res.json({
        cnpj_registered: wclValidation.exists,
        requires_stock: false,
        has_access: true,
        message: 'Usuário tem acesso total'
      });
    }
    
    if (wclValidation.exists) {
      // CNPJ existe - verificar cli_access usando o cache
      const hasAccess = checkClientAccess(req, cnpj);
      return res.json({
        cnpj_registered: true,
        requires_stock: false,
        has_access: hasAccess,
        message: hasAccess ? 'CNPJ autorizado' : 'CNPJ não autorizado para este usuário'
          });
        } else {
      // CNPJ não existe - estoque obrigatório
      return res.json({
        cnpj_registered: false,
        requires_stock: true,
        has_access: true,
        message: 'CNPJ não cadastrado - estoque obrigatório'
      });
    }
    
  } catch (error) {
    console.error('Erro ao verificar requisitos do CNPJ:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Validar CNPJ na tabela wcl
router.post('/validate-client', async (req, res) => {
  try {
    const { cnpj } = req.body;
    
    if (!cnpj) {
      return res.status(400).json({
        error: 'CNPJ é obrigatório'
      });
    }
    
    // Validar formato do CNPJ
    if (!validateCNPJ(cnpj)) {
      return res.status(400).json({
        error: 'CNPJ inválido'
      });
    }
    
    // Verificar se o usuário tem acesso ao cliente
    // Usuários nível 0 têm acesso total, outros precisam verificar cli_access
    if (req.user.level_access > 0 && !hasClientAccess(req.user.cli_access, cnpj)) {
      return res.status(403).json({
        error: 'Você não tem permissão para validar este cliente'
      });
    }
    
    // Validar na tabela wcl
    const validation = await validateClientInWcl(cnpj);
    
    if (validation.exists) {
      const data = validation.data;
      res.json({
        valid: true,
        message: 'Cliente encontrado na base de dados',
        client: {
          cnpj: data.cnpj_cpf,
          name: data.nome || data.razao_social || data.cliente || `Cliente ${data.cnpj_cpf}`,
          number: data.numero || data.cod_cliente || data.codigo || data.cnpj_cpf
        }
      });
    } else {
      res.json({
        valid: false,
        message: 'Cliente não encontrado na base de dados',
        error: validation.error || null
      });
    }
    
  } catch (error) {
    console.error('Erro ao validar cliente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Buscar agendamento por ID
router.get('/:id', validate(paramSchemas.id, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    const schedules = await executeCheckinQuery(
      `SELECT 
        id, number, nfe_key, client, case_count, date, status, historic, qt_prod, info, no_dp
       FROM schedule_list 
       WHERE id = ?`,
      [id]
    );

    if (schedules.length === 0) {
      return res.status(404).json({
        error: 'Agendamento não encontrado'
      });
    }

    const schedule = schedules[0];
    
    // Verificar permissões de acesso ao cliente
    // Usuários nível 0 têm acesso total, outros precisam verificar cli_access
    if (!req.user._clientAccessCache.hasFullAccess && !checkClientAccess(req, schedule.client)) {
      return res.status(403).json({
        error: 'Você não tem permissão para visualizar este agendamento'
      });
    }
    
    // Extrair total_value do info se disponível
    let totalValue = null;
    let parsedInfo = null;
    
    if (schedule.info) {
      try {
        parsedInfo = typeof schedule.info === 'string' ? 
          JSON.parse(schedule.info) : schedule.info;
        
        // Buscar valor total na estrutura correta do XML: total.ICMSTot.vProd
        if (parsedInfo.total && parsedInfo.total.ICMSTot) {
          totalValue = parsedInfo.total.ICMSTot.vProd || parsedInfo.total.ICMSTot.vNF || null;
        } else {
          // Fallback: calcular somando todos os produtos
          if (parsedInfo.products && Array.isArray(parsedInfo.products)) {
            totalValue = parsedInfo.products.reduce((sum, product) => {
              return sum + (product.total_value || 0);
            }, 0);
          } else {
            totalValue = null;
          }
        }
      } catch (e) {
        parsedInfo = schedule.info;
      }
    }

    // Processar dados
    const processedSchedule = {
      ...schedule,
      no_dp: schedule.no_dp || null, // Número do Documento de Portaria
      historic: typeof schedule.historic === 'string' ? 
        JSON.parse(schedule.historic) : schedule.historic,
      info: parsedInfo,
      total_value: totalValue,
      date: schedule.date instanceof Date ? 
        `${schedule.date.getFullYear()}-${String(schedule.date.getMonth() + 1).padStart(2, '0')}-${String(schedule.date.getDate()).padStart(2, '0')}` : 
        schedule.date
    };

    // Buscar informações do cliente usando a função getClientInfo
    const clientInfo = await getClientInfo(schedule.client, req.user.cli_access);
    processedSchedule.client_info = clientInfo;

    res.json({
      schedule: processedSchedule
    });

  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Criar agendamento (apenas admin/manager)
router.post('/', requireAdmin, validate(scheduleSchemas.create), async (req, res) => {
  try {
    const { 
      number, 
      nfe_key: nfeKey, 
      client, 
      case_count, 
      date, 
      status = 'Solicitado', 
      historic = {},
      supplier,
      qt_prod,
      info
    } = req.body;
    
    // Verificação de duplicidade de chave NFe
    const cleanNfeKey = nfeKey.toString().trim().replace(/[^\d]/g, '');
    const query = 'SELECT id, nfe_key, status, client, number FROM schedule_list WHERE REPLACE(REPLACE(nfe_key, " ", ""), "-", "") = ?';
    const existingSchedules = await executeCheckinQuery(query, [cleanNfeKey]);
    
    if (existingSchedules.length > 0) {
      const nonCancelledSchedules = existingSchedules.filter(schedule => 
        schedule.status !== 'Cancelado'
      );
      
      if (nonCancelledSchedules.length > 0) {
        const schedule = nonCancelledSchedules[0];
        
        return res.status(409).json({
          error: 'Chave de acesso já cadastrada',
          message: `Já existe um agendamento com esta chave de acesso (ID: ${schedule.id}, Status: ${schedule.status}). Apenas agendamentos cancelados permitem reutilização da chave.`,
          conflicting_schedule: {
            id: schedule.id,
            nfe_key: schedule.nfe_key,
            status: schedule.status,
            client: schedule.client,
            number: schedule.number
          }
        });
      }
    }
    
    // Verificação de acesso para CNPJ
    if (!req.user._clientAccessCache.hasFullAccess) {
      if (!checkClientAccess(req, client)) {
        return res.status(403).json({
          error: 'Acesso negado. Você não tem permissão para criar agendamentos para este cliente.',
          details: 'O cliente especificado não está na sua lista de acessos permitidos'
        });
      }
    }

    // Adicionar entrada inicial ao histórico
    const initialHistoric = {
      ...historic,
      created: {
        timestamp: new Date().toISOString(),
        user: req.user.user,
        action: 'Agendamento criado',
        comment: 'Agendamento criado no sistema'
      }
    };

    // Inserir agendamento na tabela schedule_list do dbcheckin
    const result = await executeCheckinQuery(
      `INSERT INTO schedule_list 
       (number, nfe_key, client, case_count, date, status, historic, supplier, qt_prod, info) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [number, nfeKey, client, case_count, date, status, JSON.stringify(initialHistoric), supplier, qt_prod, JSON.stringify(info || {})]
    );

    const scheduleId = result.insertId;

    console.log(`✅ Agendamento criado - ID: ${scheduleId}`);

    // Buscar dados completos do agendamento para o e-mail
    const createdSchedules = await executeCheckinQuery(
      'SELECT * FROM schedule_list WHERE id = ?',
      [scheduleId]
    );

    const createdSchedule = createdSchedules[0];

    // Preparar dados completos do agendamento para e-mail
    const clientInfo = await getClientInfo(createdSchedule.client, req.user.cli_access);
    const completeScheduleData = {
      ...createdSchedule,
      client_info: clientInfo,
      client_cnpj: createdSchedule.client
    };

    // Enviar notificação por e-mail de criação (assíncrono, não bloqueia a resposta)
    emailService.sendStatusChangeNotification(
      req.user.id,
      completeScheduleData,
      null,
      'Solicitado',
      req.user.user || 'Sistema',
      'Agendamento criado no sistema'
    ).catch(error => {
      if (!error.message || !error.message.includes('e-mail configurado')) {
        console.error('Erro ao enviar e-mail de criação:', error);
      }
    });

    res.status(201).json({
      message: 'Agendamento criado com sucesso',
      schedule: {
        id: scheduleId,
        number,
        nfe_key: nfeKey,
        client,
        case_count,
        date,
        status,
        historic: initialHistoric,
        qt_prod
      }
    });

  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Criar agendamento com produtos via NFe (apenas admin/manager)
router.post('/create-with-products', requireAdmin, validate(scheduleSchemas.createWithProducts), async (req, res) => {
  try {
    const { nfe_data } = req.body;
    
    // Verificação de duplicidade de chave NFe
    if (nfe_data.nfe_key) {
      const cleanNfeKey = nfe_data.nfe_key.toString().trim().replace(/[^\d]/g, '');
      const query = 'SELECT id, nfe_key, status, client, number FROM schedule_list WHERE REPLACE(REPLACE(nfe_key, " ", ""), "-", "") = ?';
      const existingSchedules = await executeCheckinQuery(query, [cleanNfeKey]);

      if (existingSchedules.length > 0) {
        const nonCancelledSchedules = existingSchedules.filter(schedule => 
          schedule.status !== 'Cancelado'
        );

        if (nonCancelledSchedules.length > 0) {
          const schedule = nonCancelledSchedules[0];
          
          return res.status(409).json({
            error: 'Chave de acesso já cadastrada',
            message: `Já existe um agendamento com esta chave de acesso (ID: ${schedule.id}, Status: ${schedule.status}). Apenas agendamentos cancelados permitem reutilização da chave.`,
            conflicting_schedule: {
              id: schedule.id,
              nfe_key: schedule.nfe_key,
              status: schedule.status,
              client: schedule.client,
              number: schedule.number
            }
          });
        }
      }
    }
    
    // Verificação especial de acesso para CNPJ
    if (!req.user._clientAccessCache.hasFullAccess) {
      const wclValidation = await validateClientInWcl(nfe_data.client_cnpj);
      
      if (wclValidation.exists) {
        if (!checkClientAccess(req, nfe_data.client_cnpj)) {
          return res.status(403).json({
            error: 'Você não tem permissão para agendar NFe para este CNPJ',
            details: 'CNPJ está cadastrado no sistema, mas você não tem acesso a ele'
          });
        }
      } else {
        if (!nfe_data.stock_location || nfe_data.stock_location.trim() === '') {
          return res.status(400).json({
            error: 'Para CNPJs não cadastrados no sistema, a escolha do estoque é obrigatória',
            requires_stock: true,
            cnpj_not_registered: true
          });
        }
      }
    }
    
    // Adicionar entrada inicial ao histórico
    const initialHistoric = {
      created: {
        timestamp: new Date().toISOString(),
        user: req.user.user,
        action: 'Agendamento criado via NFe',
        comment: `Agendamento criado automaticamente a partir da NFe ${nfe_data.number}${nfe_data.stock_location ? ` - Estoque: ${nfe_data.stock_location}` : ''}`
      }
    };

    // Preparar informações adicionais
    const additionalInfo = {
      ...(nfe_data.info || {}),
      stock_location: nfe_data.stock_location || null,
      cnpj_registered_in_wcl: (await validateClientInWcl(nfe_data.client_cnpj)).exists
    };

    // Calculate qt_prod if not provided (sum of all product quantities)
    let qtProd = nfe_data.qt_prod;
    if (qtProd === undefined || qtProd === null) {
      if (nfe_data.products && Array.isArray(nfe_data.products)) {
        qtProd = nfe_data.products.reduce((sum, product) => sum + (product.quantity || 0), 0);
      } else {
        qtProd = 0;
      }
    }

    // Prepare INSERT parameters with null-safe values
    const insertParams = [
      nfe_data.number || null,
      nfe_data.nfe_key || null,
      nfe_data.client_cnpj || null,
      nfe_data.case_count || 0,
      nfe_data.date || null,
      'Solicitado',
      JSON.stringify(initialHistoric || {}),
      nfe_data.supplier_name || 'Não informado',
      qtProd || 0,
      JSON.stringify(additionalInfo || {})
    ];

    // Inserir agendamento na tabela schedule_list do dbcheckin
    const result = await executeCheckinQuery(
      `INSERT INTO schedule_list 
       (number, nfe_key, client, case_count, date, status, historic, supplier, qt_prod, info) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      insertParams
    );

    const scheduleId = result.insertId;
    
    console.log(`✅ Agendamento com produtos criado - ID: ${scheduleId}`);

    // Buscar dados completos do agendamento para o e-mail
    const createdSchedules = await executeCheckinQuery(
      'SELECT * FROM schedule_list WHERE id = ?',
      [scheduleId]
    );

    const createdSchedule = createdSchedules[0];

    // Preparar dados completos do agendamento para e-mail
    const clientInfo = await getClientInfo(createdSchedule.client, req.user.cli_access);
    const completeScheduleData = {
      ...createdSchedule,
      client_info: clientInfo,
      client_cnpj: createdSchedule.client
    };

    // Enviar notificação por e-mail de criação (assíncrono, não bloqueia a resposta)
    emailService.sendStatusChangeNotification(
      req.user.id,
      completeScheduleData,
      null,
      'Solicitado',
      req.user.user || 'Sistema',
      `Agendamento criado automaticamente a partir da NFe ${nfe_data.number}`
    ).catch(error => {
      if (!error.message || !error.message.includes('e-mail configurado')) {
        console.error('Erro ao enviar e-mail de criação:', error);
      }
    });

    res.status(201).json({
      message: 'Agendamento criado com sucesso',
      schedule: {
        id: scheduleId,
        number: nfe_data.number,
        nfe_key: nfe_data.nfe_key,
        client: nfe_data.client_cnpj,
        client_name: nfe_data.client_name,
        supplier_cnpj: nfe_data.supplier_cnpj,
        supplier_name: nfe_data.supplier_name,
        case_count: nfe_data.case_count,
        date: nfe_data.date,
        status: 'Solicitado',
        qt_prod: nfe_data.qt_prod,
        products_count: nfe_data.products ? nfe_data.products.length : 0
      }
    });

  } catch (error) {
    console.error('Erro ao criar agendamento com produtos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar agendamento (apenas admin/manager)
router.put('/:id', requireAdmin, validate(paramSchemas.id, 'params'), validate(scheduleSchemas.update), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      number, 
      nfe_key: nfeKey, 
      client, 
      case_count, 
      date, 
      status, 
      historic,
      qt_prod 
    } = req.body;

    // Verificar se o agendamento existe
    const existingSchedules = await executeCheckinQuery(
      'SELECT id, historic, client FROM schedule_list WHERE id = ?',
      [id]
    );

    if (existingSchedules.length === 0) {
      return res.status(404).json({
        error: 'Agendamento não encontrado'
      });
    }
    
    // Verificação de acesso para CNPJ
    if (!req.user._clientAccessCache.hasFullAccess) {
      const existingClient = existingSchedules[0].client;
      
      if (!checkClientAccess(req, existingClient)) {
        return res.status(403).json({
          error: 'Acesso negado. Você não tem permissão para atualizar agendamentos deste cliente.',
          details: 'O cliente deste agendamento não está na sua lista de acessos permitidos'
        });
      }
      
      // Se o cliente está sendo alterado, verificar acesso ao novo cliente também
      if (client !== undefined && client !== existingClient) {
        if (!checkClientAccess(req, client)) {
          return res.status(403).json({
            error: 'Acesso negado. Você não tem permissão para transferir o agendamento para este cliente.',
            details: 'O novo cliente especificado não está na sua lista de acessos permitidos'
          });
        }
      }
    }

    // Preparar dados para atualização
    const updateFields = [];
    const updateParams = [];

    if (number !== undefined) {
      updateFields.push('number = ?');
      updateParams.push(number);
    }

    if (nfeKey !== undefined) {
      updateFields.push('nfe_key = ?');
      updateParams.push(nfeKey);
    }

    if (client !== undefined) {
      updateFields.push('client = ?');
      // Temporary fix: Database column is very small, likely designed for CNPJ only
      let clientValue = client;
      
      // First check if it's already a CNPJ (14 digits only)
      if (client && /^\d{14}$/.test(client)) {
        clientValue = client;
      } else if (client && client.length > 14) {
        // For this specific case, we know the CNPJ from the debug logs
        if (client.includes('BDLNES')) {
          clientValue = '53070409000221';
        } else {
          const cnpjMatch = client.match(/\d{14}/);
          if (cnpjMatch) {
            clientValue = cnpjMatch[0];
          } else {
            clientValue = client.substring(0, 14);
          }
        }
      }
      updateParams.push(clientValue);
    }

    if (case_count !== undefined) {
      updateFields.push('case_count = ?');
      updateParams.push(case_count);
    }

    if (date !== undefined) {
      updateFields.push('date = ?');
      updateParams.push(date);
    }

    if (status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }

    if (qt_prod !== undefined) {
      updateFields.push('qt_prod = ?');
      updateParams.push(qt_prod);
    }

    // Atualizar histórico
    if (historic !== undefined) {
      const currentHistoric = typeof existingSchedules[0].historic === 'string' ? 
        JSON.parse(existingSchedules[0].historic) : existingSchedules[0].historic;
      
      const updatedHistoric = {
        ...currentHistoric,
        ...historic
      };

      updateFields.push('historic = ?');
      updateParams.push(JSON.stringify(updatedHistoric));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'Nenhum campo válido para atualização fornecido'
      });
    }

    updateParams.push(id);

    // Executar atualização
    await executeCheckinQuery(
      `UPDATE schedule_list SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    res.json({
      message: 'Agendamento atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar status do agendamento com histórico detalhado
router.patch('/:id/status', validate(paramSchemas.id, 'params'), validate(scheduleSchemas.updateStatus), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, historic_entry } = req.body;

    // Verificar se o agendamento existe
    const existingSchedules = await executeCheckinQuery(
      'SELECT id, historic, status, client FROM schedule_list WHERE id = ?',
      [id]
    );

    if (existingSchedules.length === 0) {
      return res.status(404).json({
        error: 'Agendamento não encontrado'
      });
    }

    const schedule = existingSchedules[0];

    // Verificar permissões de acesso ao cliente
    // Usuários nível 0 têm acesso total, outros precisam verificar cli_access
    if (!req.user._clientAccessCache.hasFullAccess && !checkClientAccess(req, schedule.client)) {
      return res.status(403).json({
        error: 'Você não tem permissão para alterar este agendamento'
      });
    }

    // Atualizar histórico
    const currentHistoric = typeof schedule.historic === 'string' ? 
      JSON.parse(schedule.historic) : schedule.historic;
    
    const updatedHistoric = {
      ...currentHistoric,
      [`status_${Date.now()}`]: {
        ...historic_entry,
        timestamp: new Date().toISOString(),
        previous_status: schedule.status,
        new_status: status
      }
    };

    // Executar atualização
    await executeCheckinQuery(
      'UPDATE schedule_list SET status = ?, historic = ? WHERE id = ?',
      [status, JSON.stringify(updatedHistoric), id]
    );

    // Buscar dados completos do agendamento para o e-mail
    const updatedSchedules = await executeCheckinQuery(
      'SELECT * FROM schedule_list WHERE id = ?',
      [id]
    );

    const updatedSchedule = updatedSchedules[0];

    console.log(`✅ Status alterado: ${schedule.status} → ${status}`);

    // Triggers automáticos Corpem WMS
    if (status === 'Conferência' && schedule.status !== 'Conferência') {
      console.log('🔗 Iniciando integrações Corpem...');
      
      // 1. Salvar produtos na tabela products
      try {
        let products = [];
        if (updatedSchedule.info) {
          let info = updatedSchedule.info;
          if (typeof info === 'string') {
            info = JSON.parse(info);
          }
          products = info.products || [];
        }
        
        if (products.length > 0) {
          const saveResult = await productService.saveProductsFromSchedule(
            products, 
            updatedSchedule, 
            req.user.user
          );
        }
      } catch (productSaveError) {
        console.error('Erro ao salvar produtos:', productSaveError.message);
      }
      
      // 2. Buscar DP na tabela WTR
      try {
        const dpService = new DPVerificationServiceWithDate();
        const nfNumber = updatedSchedule.number || updatedSchedule.nfe_key;
        const clientCnpj = updatedSchedule.client;
        let clientNumber = null;
        
        if (updatedSchedule.info) {
          let info = updatedSchedule.info;
          if (typeof info === 'string') {
            info = JSON.parse(info);
          }
          clientNumber = info.client_number || info.no_cli || null;
        }
        
        const dpResult = await dpService.getDPFromWtrTableWithDate(
          nfNumber, 
          clientCnpj, 
          clientNumber,
          id
        );
        
        if (dpResult) {
          await dpService.updateScheduleDP(updatedSchedule.id, dpResult);
          updatedSchedule.no_dp = dpResult.dp_number;
        }
        
      } catch (dpSearchError) {
        console.error('Erro ao buscar DP:', dpSearchError.message);
      }
      
      // 3. Integração com Corpem
      triggerProductsIntegration(updatedSchedule, req.user.user)
        .then(result => {
          if (result.success) {
            console.log('✅ Integração produtos Corpem concluída');
            return triggerNfEntryIntegration(updatedSchedule, req.user.user);
          } else {
            console.log('⚠️ Falha na integração produtos Corpem');
            return { success: false, message: 'Produtos não foram cadastrados' };
          }
        })
        .then(nfResult => {
          if (nfResult && nfResult.success) {
            console.log('✅ Integração NF Corpem concluída');
          } else if (nfResult) {
            console.log('⚠️ Falha na integração NF Corpem');
          }
        })
        .catch(error => {
          console.error('Erro nas integrações Corpem:', error.message);
        });
    }

    // Preparar dados completos do agendamento para e-mail
    const clientInfo = await getClientInfo(updatedSchedule.client, req.user.cli_access);
    const completeUpdatedScheduleData = {
      ...updatedSchedule,
      client_info: clientInfo,
      client_cnpj: updatedSchedule.client
    };

    // Enviar notificação por e-mail (assíncrono, não bloqueia a resposta)
    emailService.sendStatusChangeNotification(
      req.user.id,
      completeUpdatedScheduleData,
      schedule.status,
      status,
      req.user.user || 'Sistema',
      historic_entry.comment
    ).catch(error => {
      if (!error.message || !error.message.includes('e-mail configurado')) {
        console.error('Erro ao enviar e-mail:', error);
      }
    });

    res.json({
      message: 'Status do agendamento atualizado com sucesso',
      status: status,
      previous_status: schedule.status
    });

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Deletar agendamento (apenas admin/manager)
router.delete('/:id', requireManager, validate(paramSchemas.id, 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o agendamento existe
    const existingSchedules = await executeCheckinQuery(
      'SELECT id, client FROM schedule_list WHERE id = ?',
      [id]
    );

    if (existingSchedules.length === 0) {
      return res.status(404).json({
        error: 'Agendamento não encontrado'
      });
    }
    
    // Verificação de acesso para CNPJ
    if (!req.user._clientAccessCache.hasFullAccess) {
      const existingClient = existingSchedules[0].client;
      
      if (!checkClientAccess(req, existingClient)) {
        return res.status(403).json({
          error: 'Acesso negado. Você não tem permissão para excluir agendamentos deste cliente.',
          details: 'O cliente deste agendamento não está na sua lista de acessos permitidos'
        });
      }
    }

    // Deletar agendamento
    await executeCheckinQuery(
      'DELETE FROM schedule_list WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Agendamento deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Buscar agendamentos por cliente
router.get('/client/:client', requireClientAccess('client'), async (req, res) => {
  try {
    const { client } = req.params;
    const { page = 1, limit = 10, status = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE client = ?';
    let params = [parseInt(client)];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const schedules = await executeCheckinQuery(
      `SELECT 
        id, number, nfe_key, client, case_count, date, status, historic, qt_prod
       FROM schedule_list 
       ${whereClause}
       ORDER BY date DESC, id DESC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      params
    );

    // Processar dados de retorno
    const processedSchedules = schedules.map(schedule => ({
      ...schedule,
      historic: typeof schedule.historic === 'string' ? 
        JSON.parse(schedule.historic) : schedule.historic,
      date: schedule.date instanceof Date ? 
        `${schedule.date.getFullYear()}-${String(schedule.date.getMonth() + 1).padStart(2, '0')}-${String(schedule.date.getDate()).padStart(2, '0')}` : 
        schedule.date
    }));

    // Contar total para o cliente
    const [{ total }] = await executeCheckinQuery(
      `SELECT COUNT(*) as total FROM schedule_list ${whereClause}`,
      params
    );

    res.json({
      client: parseInt(client),
      schedules: processedSchedules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar agendamentos do cliente:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para fazer parse de XML e verificar duplicidade de chave NFe
router.post('/parse-xml', upload.single('xml_file'), async (req, res) => {
  try {
    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        error: 'Arquivo XML é obrigatório'
      });
    }

    // Converter XML para JSON
    const parser = new xml2js.Parser({ explicitArray: false });
    const xmlContent = req.file.buffer.toString();
    
    let parsedXML;
    try {
      parsedXML = await parser.parseStringPromise(xmlContent);
    } catch (xmlError) {
      console.error('Erro ao fazer parse do XML:', xmlError);
      return res.status(400).json({
        error: 'Estrutura XML inválida'
      });
    }

    // Extrair chave de acesso do XML
    let nfeKey = null;
    try {
      // Tentar extrair a chave de diferentes estruturas possíveis do XML NFe
      if (parsedXML.nfeProc && parsedXML.nfeProc.NFe && parsedXML.nfeProc.NFe.infNFe) {
        nfeKey = parsedXML.nfeProc.NFe.infNFe.$.Id.replace('NFe', '');
      } else if (parsedXML.NFe && parsedXML.NFe.infNFe) {
        nfeKey = parsedXML.NFe.infNFe.$.Id.replace('NFe', '');
      } else if (parsedXML.enviNFe && parsedXML.enviNFe.NFe) {
        const nfe = Array.isArray(parsedXML.enviNFe.NFe) ? parsedXML.enviNFe.NFe[0] : parsedXML.enviNFe.NFe;
        nfeKey = nfe.infNFe.$.Id.replace('NFe', '');
      }

      if (!nfeKey || nfeKey.length !== 44) {
        return res.status(400).json({
          error: 'Chave de acesso NFe não encontrada ou inválida no XML'
        });
      }
    } catch (extractError) {
      console.error('Erro ao extrair chave NFe:', extractError);
      return res.status(400).json({
        error: 'Estrutura XML inválida - NFe não encontrada'
      });
    }

    // Verificar se já existe um agendamento com a mesma chave de acesso
    const cleanNfeKey = nfeKey.toString().trim().replace(/[^\d]/g, '');
    
    const existingSchedules = await executeCheckinQuery(
      'SELECT id, nfe_key, status, client, number FROM schedule_list WHERE REPLACE(REPLACE(nfe_key, " ", ""), "-", "") = ?',
      [cleanNfeKey]
    );

    if (existingSchedules.length > 0) {
      const nonCancelledSchedules = existingSchedules.filter(schedule => 
        schedule.status !== 'Cancelado'
      );

      if (nonCancelledSchedules.length > 0) {
        const schedule = nonCancelledSchedules[0];
        
        return res.status(409).json({
          error: 'Chave de acesso já cadastrada',
          message: `Já existe um agendamento com esta chave de acesso (ID: ${schedule.id}, Status: ${schedule.status}). Apenas agendamentos cancelados permitem reutilização da chave.`,
          conflicting_schedule: {
            id: schedule.id,
            nfe_key: schedule.nfe_key,
            status: schedule.status,
            client: schedule.client,
            number: schedule.number
          }
        });
      }
    }

    // Se passou na verificação, retornar os dados parseados
    res.json({
      success: true,
      message: 'XML parseado com sucesso',
      nfe_key: nfeKey,
      data: parsedXML
    });

  } catch (error) {
    console.error('Erro ao processar arquivo XML:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível processar o arquivo XML'
    });
  }
});

// Estatísticas de agendamentos
router.get('/stats/summary', async (req, res) => {
  try {
    // Construir a consulta com base no nível de acesso do usuário
    let query = `SELECT 
        COUNT(*) as total,
      COUNT(CASE WHEN status = 'Solicitado' THEN 1 END) as solicitado,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        SUM(case_count) as total_cases,
        SUM(qt_prod) as total_products
     FROM schedule_list`;
    
    // Adicionar filtro de cli_access para usuários que não têm acesso total
    const params = [];
    
    if (!req.user._clientAccessCache.hasFullAccess) {
      const allowedClients = req.user._clientAccessCache.allowedClients;
      
      if (allowedClients.length === 0) {
        // Se o usuário não tem acesso a nenhum cliente, retornar estatísticas vazias
        return res.json({
          statistics: {
            total: 0,
            solicitado: 0,
            processing: 0,
            completed: 0,
            cancelled: 0,
            total_cases: 0,
            total_products: 0
          }
        });
      }
      
      // Adicionar WHERE para filtrar apenas os clientes permitidos
      query += ` WHERE client IN (${allowedClients.map(() => '?').join(',')})`;
      params.push(...allowedClients);
    }
    
    const stats = await executeCheckinQuery(query, params);

    res.json({
      statistics: stats[0]
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router; 