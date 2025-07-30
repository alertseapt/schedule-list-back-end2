const jwt = require('jsonwebtoken');
const { executeUsersQuery } = require('../config/database');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Token de acesso requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Tentar verificar se o usuário ainda existe no banco dbusers
    // Se falhar por problemas de conectividade, usar dados do token como fallback
    let userData = null;
    
    try {
      const users = await executeUsersQuery(
        'SELECT id, user, name, level_access, cli_access FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length === 0) {
        return res.status(401).json({
          error: 'Usuário não encontrado'
        });
      }

      userData = users[0];
    } catch (dbError) {
      console.warn('⚠️ Problema de conectividade com dbusers, usando dados do token como fallback:', dbError.message);
      
      // Fallback: usar dados básicos do token quando há problemas de conectividade
      // Isso permite que o sistema continue funcionando durante problemas de rede
      userData = {
        id: decoded.userId,
        user: decoded.user || 'user',
        name: decoded.name || 'Usuário',
        level_access: decoded.level_access || 0,
        cli_access: decoded.cli_access || {}
      };
    }
    
    // Adicionar informações do usuário ao request
    req.user = {
      id: userData.id,
      user: userData.user,
      name: userData.name,
      level_access: userData.level_access,
      cli_access: typeof userData.cli_access === 'string' ? 
        JSON.parse(userData.cli_access) : userData.cli_access
    };
    
    // Pré-processar informações de acesso a clientes para evitar verificações repetidas
    req.user._clientAccessCache = {
      // Usuários com level_access = 0 (desenvolvedores) têm acesso total
      hasFullAccess: req.user.level_access === 0,
      // Lista de CNPJs permitidos para este usuário
      allowedClients: req.user.level_access === 0 ? [] : Object.keys(req.user.cli_access || {}),
      // Função para verificar acesso a um cliente específico (já pré-calculada)
      hasAccessTo: {}
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado'
      });
    }
    
    console.error('Erro na autenticação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

// Middleware para verificar permissões de administrador 
// Permite criação para níveis 0, 1, 2, 3 (todos os usuários autenticados)
const requireAdmin = (req, res, next) => {
  if (req.user.level_access === undefined || req.user.level_access < 0) {
    return res.status(403).json({
      error: 'Acesso negado. Usuário deve estar autenticado.'
    });
  }
  next();
};

// Middleware para verificar permissões de manager (level_access >= 2)
const requireManager = (req, res, next) => {
  if (req.user.level_access < 2) {
    return res.status(403).json({
      error: 'Acesso negado. Permissões de gerente requeridas.'
    });
  }
  next();
};

// Middleware para verificar se o usuário pode acessar o recurso
const requireOwnershipOrAdmin = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user.level_access >= 1 || req.user.id == resourceUserId) {
      next();
    } else {
      res.status(403).json({
        error: 'Acesso negado. Você só pode acessar seus próprios recursos.'
      });
    }
  };
};

// Função auxiliar para verificar acesso a cliente usando o cache
const checkClientAccess = (req, clientId) => {
  if (!clientId) return false;
  
  // Se o usuário tem acesso total, retorna true imediatamente
  if (req.user._clientAccessCache.hasFullAccess) {
    return true;
  }
  
  // Converter para string para garantir comparação correta
  const clientIdStr = clientId.toString();
  
  // Verificar se já temos o resultado em cache
  if (req.user._clientAccessCache.hasAccessTo[clientIdStr] !== undefined) {
    return req.user._clientAccessCache.hasAccessTo[clientIdStr];
  }
  
  // Calcular o resultado e armazenar em cache
  const hasAccess = req.user._clientAccessCache.allowedClients.includes(clientIdStr);
  req.user._clientAccessCache.hasAccessTo[clientIdStr] = hasAccess;
  
  return hasAccess;
};

// Middleware para verificar acesso a cliente específico baseado no cli_access
const requireClientAccess = (clientField = 'client') => {
  return (req, res, next) => {
    // Verificar se o usuário tem acesso total (level_access = 0)
    if (req.user._clientAccessCache.hasFullAccess) {
      next();
      return;
    }
    
    const clientId = req.params[clientField] || req.body[clientField] || req.query[clientField];
    
    // Se não há cliente especificado e é usuário comum, nega acesso
    if (!clientId) {
      return res.status(403).json({
        error: 'Acesso negado. Cliente não especificado.'
      });
    }
    
    // Verificar se o usuário tem acesso ao cliente usando a função de cache
    const hasAccess = checkClientAccess(req, clientId);
    
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Acesso negado. Você não tem permissão para acessar este cliente.'
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireManager,
  requireOwnershipOrAdmin,
  requireClientAccess,
  checkClientAccess
};