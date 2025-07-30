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
    console.log('🤖 Trigger automático: integrando produtos para agendamento', scheduleData.id);
    
    // Verificar se configuração do Corpem está válida
    if (!corpemService.isConfigValid()) {
      console.log('⚠️ Configurações do Corpem não estão válidas, pulando integração');
      return { success: false, message: 'Configurações do Corpem incompletas' };
    }

    // Verificar se tem produtos
    const products = corpemService.extractProductsFromSchedule(scheduleData);
    if (!products || products.length === 0) {
      console.log('⚠️ Nenhum produto encontrado, pulando integração');
      return { success: false, message: 'Nenhum produto encontrado' };
    }

    // Integrar produtos
    const result = await corpemService.registerProducts(scheduleData);
    
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
    console.log('🤖 Trigger automático: integrando NF de entrada para agendamento', scheduleData.id);
    
    // Verificar se configuração do Corpem está válida
    if (!corpemService.isConfigValid()) {
      console.log('⚠️ Configurações do Corpem não estão válidas, pulando integração');
      return { success: false, message: 'Configurações do Corpem incompletas' };
    }

    // Integrar NF de entrada
    const result = await corpemService.registerNfEntry(scheduleData);
    
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
module.exports.triggerProductsIntegration = triggerProductsIntegration;
module.exports.triggerNfEntryIntegration = triggerNfEntryIntegration;