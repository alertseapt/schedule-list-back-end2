const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const dpVerificationService = require('../services/dpVerificationService');

const router = express.Router();

// Todas as rotas requerem autenticação de admin
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Inicia o serviço de verificação de DP
 */
router.post('/start', async (req, res) => {
  try {
    dpVerificationService.start();
    
    res.json({
      success: true,
      message: 'Serviço de verificação de DP iniciado com sucesso',
      status: dpVerificationService.getStatus()
    });
  } catch (error) {
    console.error('Erro ao iniciar serviço de verificação de DP:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Para o serviço de verificação de DP
 */
router.post('/stop', async (req, res) => {
  try {
    dpVerificationService.stop();
    
    res.json({
      success: true,
      message: 'Serviço de verificação de DP parado com sucesso',
      status: dpVerificationService.getStatus()
    });
  } catch (error) {
    console.error('Erro ao parar serviço de verificação de DP:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Obtém o status do serviço de verificação de DP
 */
router.get('/status', async (req, res) => {
  try {
    const status = dpVerificationService.getStatus();
    
    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    console.error('Erro ao obter status do serviço:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Força verificação manual de um agendamento específico
 */
router.post('/verify/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    if (!scheduleId || isNaN(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do agendamento inválido'
      });
    }

    const result = await dpVerificationService.forceVerification(parseInt(scheduleId));
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        dpNumber: result.dpNumber,
        scheduleId: parseInt(scheduleId)
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
        scheduleId: parseInt(scheduleId)
      });
    }
  } catch (error) {
    console.error('Erro na verificação manual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

/**
 * Executa uma verificação completa manual (sem esperar o intervalo)
 */
router.post('/run-verification', async (req, res) => {
  try {
    // Executar verificação de forma assíncrona para não bloquear a resposta
    dpVerificationService.runVerification().then(() => {
      console.log('✅ Verificação manual completa executada');
    }).catch(error => {
      console.error('❌ Erro na verificação manual completa:', error);
    });
    
    res.json({
      success: true,
      message: 'Verificação manual iniciada. Verifique os logs para acompanhar o progresso.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao executar verificação manual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;