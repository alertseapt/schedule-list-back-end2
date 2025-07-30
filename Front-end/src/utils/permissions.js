/**
 * Sistema de permissões do usuário
 * Verifica permissões específicas e níveis de acesso
 */

// Função para verificar permissões específicas
export function checkPermission(permission) {
  const userData = localStorage.getItem('user')
  if (!userData) return false

  try {
    const user = JSON.parse(userData)

    // Desenvolvedores (nível 0) têm todas as permissões
    if (user.level_access === 0) return true

    // Verificar permissões específicas baseado no nível
    const permissions = {
      create_schedule: [0, 1, 2, 3], // Todos os usuários podem criar agendamentos
      manage_users: [0, 2], // Apenas desenvolvedores e administradores
      view_reports: [0, 2, 3], // Desenvolvedores, admins e gerentes
      system_config: [0], // Apenas desenvolvedores
    }

    return permissions[permission]?.includes(user.level_access) || false
  } catch (error) {
    console.error('Erro ao verificar permissão:', error)
    return false
  }
}

// Função para verificar nível de usuário
export function checkUserLevel(minLevel) {
  const userData = localStorage.getItem('user')
  if (!userData) return false

  try {
    const user = JSON.parse(userData)
    return user.level_access <= minLevel // Menor número = maior nível
  } catch (error) {
    console.error('Erro ao verificar nível do usuário:', error)
    return false
  }
}

// Função para obter nome do nível de acesso
export function getLevelName(level) {
  const levels = {
    0: 'Desenvolvedor',
    1: 'Usuário',
    2: 'Administrador',
    3: 'Gerente',
  }
  return levels[level] || 'Usuário'
}

// Torna as funções globais para compatibilidade com código existente
if (typeof window !== 'undefined') {
  window.checkPermission = checkPermission
  window.checkUserLevel = checkUserLevel
  window.getLevelName = getLevelName
}
