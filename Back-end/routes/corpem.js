const express = require('express');
const { executeCheckinQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const corpemService = require('../services/corpemIntegration');
const Joi = require('joi');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * Testa conectividade com Corpem WMS
 */
router.get('/test-connection', requireAdmin, async (req, res) => {
  try {
    console.log('🔄 Testando conexão com Corpem WMS');
    
    const result = await corpemService.testConnection();
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao testar conexão com Corpem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Integra produtos de um agendamento específico no Corpem WMS
 * (Integração 01 - Cadastro de Mercadorias)
 */
router.post('/integrate-products/:scheduleId', requireAdmin, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    console.log('🔄 Iniciando integração de produtos para agendamento:', scheduleId);
    
    // Buscar dados do agendamento
    const schedules = await executeCheckinQuery(
      `SELECT 
        id, number, nfe_key, client, case_count, date, status, historic, supplier, qt_prod, info, observations
       FROM schedule_list 
       WHERE id = ?`,
      [scheduleId]
    );

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    const schedule = schedules[0];
    
    // Processar campo info se for string
    if (schedule.info && typeof schedule.info === 'string') {
      try {
        schedule.info = JSON.parse(schedule.info);
      } catch (e) {
        console.log('Erro ao parsear info, mantendo como string');
      }
    }

    // Verificar se agendamento tem produtos
    const products = corpemService.extractProductsFromSchedule(schedule);
    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum produto encontrado no agendamento'
      });
    }

    // Integrar produtos no Corpem
    const result = await corpemService.registerProducts(schedule);
    
    // Registrar log da integração
    await logCorpemIntegration(scheduleId, 'products', result, req.user.user);
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.data,
      schedule_id: scheduleId,
      products_count: products.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na integração de produtos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Integra NF de entrada de um agendamento específico no Corpem WMS
 * (Integração 02 - NF de Entrada)
 */
router.post('/integrate-nf-entry/:scheduleId', requireAdmin, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    console.log('🔄 Iniciando integração de NF de entrada para agendamento:', scheduleId);
    
    // Buscar dados do agendamento
    const schedules = await executeCheckinQuery(
      `SELECT 
        id, number, nfe_key, client, case_count, date, status, historic, supplier, qt_prod, info, observations
       FROM schedule_list 
       WHERE id = ?`,
      [scheduleId]
    );

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    const schedule = schedules[0];
    
    // Processar campo info se for string
    if (schedule.info && typeof schedule.info === 'string') {
      try {
        schedule.info = JSON.parse(schedule.info);
      } catch (e) {
        console.log('Erro ao parsear info, mantendo como string');
      }
    }

    // Integrar NF de entrada no Corpem
    const result = await corpemService.registerNfEntry(schedule);
    
    // Registrar log da integração
    await logCorpemIntegration(scheduleId, 'nf_entry', result, req.user.user);
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.data,
      schedule_id: scheduleId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na integração de NF de entrada:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Integra produtos automaticamente quando agendamento vira "Agendado"
 * (Trigger automático - chamado internamente)
 */
async function triggerProductsIntegration(scheduleData, userId = 'system') {
  try {
    console.log('\n🔥🔥🔥 TRIGGER PRODUTOS DISPARADO 🔥🔥🔥');
    console.log('🤖 Trigger automático: integrando produtos para agendamento', scheduleData.id);
    console.log('👤 Usuário:', userId);
    console.log('📋 Dados do agendamento:', {
      id: scheduleData.id,
      client: scheduleData.client,
      number: scheduleData.number,
      status: scheduleData.status
    });
    
    // Verificar se configuração do Corpem está válida
    console.log('🔍 Verificando configurações do Corpem...');
    if (!corpemService.isConfigValid()) {
      console.log('❌ Configurações do Corpem não estão válidas, pulando integração');
      return { success: false, message: 'Configurações do Corpem incompletas' };
    }
    console.log('✅ Configurações do Corpem válidas');

    // Verificar se tem produtos
    console.log('🔍 Extraindo produtos do agendamento...');
    const products = corpemService.extractProductsFromSchedule(scheduleData);
    if (!products || products.length === 0) {
      console.log('❌ Nenhum produto encontrado, pulando integração');
      return { success: false, message: 'Nenhum produto encontrado' };
    }
    console.log(`✅ Encontrados ${products.length} produtos para integração`);

    // Integrar produtos
    console.log('🚀 Chamando corpemService.registerProducts...');
    const result = await corpemService.registerProducts(scheduleData);
    console.log('📥 Resultado da integração de produtos:', result);
    
    // Registrar log
    await logCorpemIntegration(scheduleData.id, 'products', result, userId);
    
    return result;

  } catch (error) {
    console.error('Erro no trigger de integração de produtos:', error);
    await logCorpemIntegration(scheduleData.id, 'products', {
      success: false,
      message: error.message,
      error: error.toString()
    }, userId);
    
    return { success: false, message: error.message };
  }
}

/**
 * Integra NF de entrada automaticamente para todos os agendamentos
 * (Trigger automático - chamado internamente)
 */
async function triggerNfEntryIntegration(scheduleData, userId = 'system') {
  try {
    console.log('\n🔥🔥🔥 TRIGGER NF ENTRY DISPARADO 🔥🔥🔥');
    console.log('🤖 Trigger automático: integrando NF de entrada para agendamento', scheduleData.id);
    console.log('👤 Usuário:', userId);
    console.log('📋 Dados do agendamento:', {
      id: scheduleData.id,
      client: scheduleData.client,
      number: scheduleData.number,
      status: scheduleData.status
    });
    
    // Verificar se configuração do Corpem está válida
    console.log('🔍 Verificando configurações do Corpem...');
    if (!corpemService.isConfigValid()) {
      console.log('❌ Configurações do Corpem não estão válidas, pulando integração');
      return { success: false, message: 'Configurações do Corpem incompletas' };
    }
    console.log('✅ Configurações do Corpem válidas');

    // Integrar NF de entrada
    console.log('🚀 Chamando corpemService.registerNfEntry...');
    const result = await corpemService.registerNfEntry(scheduleData);
    console.log('📥 Resultado da integração de NF:', result);
    
    // Registrar log
    await logCorpemIntegration(scheduleData.id, 'nf_entry', result, userId);
    
    return result;

  } catch (error) {
    console.error('Erro no trigger de integração de NF de entrada:', error);
    await logCorpemIntegration(scheduleData.id, 'nf_entry', {
      success: false,
      message: error.message,
      error: error.toString()
    }, userId);
    
    return { success: false, message: error.message };
  }
}

/**
 * Reprocessa integrações de um agendamento específico
 */
router.post('/reprocess-integrations/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    // Buscar dados do agendamento
    const scheduleData = await executeCheckinQuery(
      'SELECT * FROM schedule_list WHERE id = ?',
      [scheduleId]
    );
    
    if (scheduleData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }
    
    const schedule = scheduleData[0];
    const userId = req.user?.user || req.user?.name || 'system';
    
    console.log(`🔄 Reprocessando integrações para agendamento ${scheduleId}`);
    
    // Reprocessar integração de produtos
    console.log('🔄 Reprocessando integração de produtos...');
    const productsResult = await triggerProductsIntegration(schedule, userId);
    console.log('📥 Resultado reprocessamento produtos:', productsResult);
    
    // Reprocessar integração de NF apenas se produtos foram bem-sucedidos
    let nfResult = null;
    if (productsResult.success) {
      console.log('🔄 Produtos reprocessados com sucesso! Reprocessando integração de NF...');
      nfResult = await triggerNfEntryIntegration(schedule, userId);
      console.log('📥 Resultado reprocessamento NF:', nfResult);
    } else {
      console.log('🚫 Produtos falharam, NF não será reprocessada');
    }
    
    // Preparar resposta
    const results = {
      products: productsResult,
      nf_entry: nfResult
    };
    
    const allSuccessful = productsResult.success && (!nfResult || nfResult.success);
    
    res.json({
      success: true,
      message: allSuccessful ? 'Reprocessamento iniciado com sucesso' : 'Reprocessamento iniciado com alguns erros',
      results,
      scheduleId: parseInt(scheduleId)
    });

  } catch (error) {
    console.error('Erro ao reprocessar integrações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Lista logs de integração com Corpem
 */
router.get('/integration-logs', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, scheduleId = '', type = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = '';
    const params = [];
    
    if (scheduleId) {
      whereClause += ' WHERE schedule_id = ?';
      params.push(scheduleId);
    }
    
    if (type) {
      whereClause += scheduleId ? ' AND' : ' WHERE';
      whereClause += ' integration_type = ?';
      params.push(type);
    }
    
    const logs = await executeCheckinQuery(
      `SELECT 
        id, schedule_id, integration_type, success, message, error_details, user_id, created_at
       FROM corpem_integration_logs 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );
    
    const countResult = await executeCheckinQuery(
      `SELECT COUNT(*) as total FROM corpem_integration_logs ${whereClause}`,
      params
    );
    
    res.json({
      logs,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });

  } catch (error) {
    // Se a tabela não existir, retornar array vazio
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('⚠️ Tabela corpem_integration_logs não existe ainda, retornando lista vazia');
      return res.json({
        logs: [],
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0
        }
      });
    }
    
    console.error('Erro ao buscar logs de integração:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Reprocessa integrações falhadas
 */
router.post('/reprocess-failed', requireAdmin, async (req, res) => {
  try {
    const { scheduleIds, integrationType } = req.body;
    
    if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de IDs de agendamento é obrigatória'
      });
    }
    
    if (!['products', 'nf_entry'].includes(integrationType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de integração deve ser "products" ou "nf_entry"'
      });
    }
    
    const results = [];
    
    for (const scheduleId of scheduleIds) {
      try {
        // Buscar dados do agendamento
        const schedules = await executeCheckinQuery(
          `SELECT 
            id, number, nfe_key, client, case_count, date, status, historic, supplier, qt_prod, info, observations
           FROM schedule_list 
           WHERE id = ?`,
          [scheduleId]
        );

        if (schedules.length === 0) {
          results.push({
            scheduleId,
            success: false,
            message: 'Agendamento não encontrado'
          });
          continue;
        }

        const schedule = schedules[0];
        
        // Processar campo info se for string
        if (schedule.info && typeof schedule.info === 'string') {
          try {
            schedule.info = JSON.parse(schedule.info);
          } catch (e) {
            console.log('Erro ao parsear info, mantendo como string');
          }
        }

        let result;
        if (integrationType === 'products') {
          result = await corpemService.registerProducts(schedule);
        } else {
          result = await corpemService.registerNfEntry(schedule);
        }
        
        // Registrar log
        await logCorpemIntegration(scheduleId, integrationType, result, req.user.user);
        
        results.push({
          scheduleId,
          success: result.success,
          message: result.message
        });

      } catch (error) {
        console.error(`Erro ao reprocessar agendamento ${scheduleId}:`, error);
        results.push({
          scheduleId,
          success: false,
          message: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Reprocessamento concluído para ${results.length} agendamentos`,
      results
    });

  } catch (error) {
    console.error('Erro no reprocessamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Busca erros de um agendamento específico
 */
router.get('/schedule-errors/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    // Buscar logs de erro para o agendamento
    const errorLogs = await executeCheckinQuery(
      `SELECT 
        id, integration_type, success, message, error_details, user_id, created_at
       FROM corpem_integration_logs 
       WHERE schedule_id = ? AND success = 0
       ORDER BY created_at DESC`,
      [scheduleId]
    );
    
    // Buscar também erros de verificação de DP se existir
    let dpErrors = [];
    try {
      dpErrors = await executeCheckinQuery(
        `SELECT 
          id, 'dp_verification' as integration_type, 0 as success, 
          CONCAT('Falha na verificação de DP: ', COALESCE(error_message, 'Erro desconhecido')) as message,
          error_details, user_id, created_at
         FROM dp_verification_logs 
         WHERE schedule_id = ? AND success = 0
         ORDER BY created_at DESC`,
        [scheduleId]
      );
    } catch (dpError) {
      // Se a tabela não existir, ignorar
      console.log('Tabela dp_verification_logs não existe, ignorando erros de DP');
    }
    
    // Combinar todos os erros
    const allErrors = [...errorLogs, ...dpErrors].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    // Contar erros por tipo
    const errorCounts = {
      products: errorLogs.filter(log => log.integration_type === 'products').length,
      nf_entry: errorLogs.filter(log => log.integration_type === 'nf_entry').length,
      dp_verification: dpErrors.length,
      total: allErrors.length
    };
    
    res.json({
      success: true,
      errors: allErrors,
      errorCounts,
      hasErrors: allErrors.length > 0
    });

  } catch (error) {
    console.error('Erro ao buscar erros do agendamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Busca agendamentos que possuem erros
 */
router.get('/schedules-with-errors', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Buscar agendamentos que possuem erros
    // NOTA: A tabela schedule_list não possui coluna 'updated_at'
    // As atualizações são rastreadas no campo JSON 'historic'
    const schedulesWithErrors = await executeCheckinQuery(
      `SELECT DISTINCT 
        s.id, s.number, s.client, s.date, s.status, s.historic,
        COUNT(cil.id) as error_count,
        MAX(cil.created_at) as last_error_date
       FROM schedule_list s
       INNER JOIN corpem_integration_logs cil ON s.id = cil.schedule_id
       WHERE cil.success = 0
       GROUP BY s.id, s.number, s.client, s.date, s.status, s.historic
       ORDER BY last_error_date DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      []
    );
    
    // Contar total de agendamentos com erros
    const countResult = await executeCheckinQuery(
      `SELECT COUNT(DISTINCT s.id) as total
       FROM schedule_list s
       INNER JOIN corpem_integration_logs cil ON s.id = cil.schedule_id
       WHERE cil.success = 0`,
      []
    );
    
    res.json({
      success: true,
      schedules: schedulesWithErrors,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar agendamentos com erros:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Função auxiliar para registrar logs de integração
 * @param {Number} scheduleId 
 * @param {String} integrationType 
 * @param {Object} result 
 * @param {String} userId 
 */
async function logCorpemIntegration(scheduleId, integrationType, result, userId) {
  try {
    await executeCheckinQuery(
      `INSERT INTO corpem_integration_logs 
       (schedule_id, integration_type, success, message, error_details, user_id, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        scheduleId,
        integrationType,
        result.success ? 1 : 0,
        result.message || '',
        result.error ? JSON.stringify(result.error) : null,
        userId
      ]
    );
  } catch (error) {
    // Se a tabela não existir, tentar criá-la automaticamente
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('📋 Tabela corpem_integration_logs não existe, criando automaticamente...');
      
      try {
        // Criar a tabela
        await executeCheckinQuery(`
          CREATE TABLE IF NOT EXISTS corpem_integration_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            schedule_id INT NOT NULL,
            integration_type ENUM('products', 'nf_entry') NOT NULL,
            success TINYINT(1) NOT NULL DEFAULT 0,
            message TEXT,
            error_details TEXT,
            user_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            INDEX idx_schedule_id (schedule_id),
            INDEX idx_integration_type (integration_type),
            INDEX idx_success (success),
            INDEX idx_created_at (created_at)
          ) COMMENT = 'Logs das integrações com Corpem WMS'
        `);
        
        console.log('✅ Tabela corpem_integration_logs criada com sucesso');
        
        // Tentar inserir o log novamente
        await executeCheckinQuery(
          `INSERT INTO corpem_integration_logs 
           (schedule_id, integration_type, success, message, error_details, user_id, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            scheduleId,
            integrationType,
            result.success ? 1 : 0,
            result.message || '',
            result.error ? JSON.stringify(result.error) : null,
            userId
          ]
        );
        
        console.log('✅ Log de integração Corpem registrado após criação da tabela');
        
      } catch (createError) {
        console.error('❌ Erro ao criar tabela corpem_integration_logs:', createError);
      }
    } else {
      console.error('Erro ao registrar log de integração:', error);
    }
  }
}

// Exportar funções para uso interno
module.exports = router;
/**
 * Função utilitária para extrair a última data de atualização do campo historic JSON
 * Usada quando a coluna updated_at não existe na tabela schedule_list
 * 
 * @param {String|Object} historic - Campo JSON historic do agendamento
 * @returns {Date|null} - Data da última atualização ou null
 */
function getLastUpdateFromHistoric(historic) {
  try {
    if (!historic) return null;
    
    const historicData = typeof historic === 'string' ? JSON.parse(historic) : historic;
    const entries = Object.values(historicData);
    
    if (entries.length === 0) return null;
    
    // Encontrar a entrada mais recente baseada no timestamp
    const latestEntry = entries
      .filter(entry => entry && entry.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    
    return latestEntry ? new Date(latestEntry.timestamp) : null;
  } catch (error) {
    console.error('Erro ao extrair data do histórico:', error);
    return null;
  }
}

module.exports.triggerProductsIntegration = triggerProductsIntegration;
module.exports.triggerNfEntryIntegration = triggerNfEntryIntegration;
module.exports.getLastUpdateFromHistoric = getLastUpdateFromHistoric;