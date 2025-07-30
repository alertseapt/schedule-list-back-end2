const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuração do pool de conexões para dbusers
// Contém tabela 'users' com: id, user, password, name, email, level_access (json), cli_access (json), created_by, created_at
const dbusersPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'dbusers',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'utf8mb4',
  idleTimeout: 300000,
  maxIdle: 5,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Configuração do pool de conexões para dbcheckin
// Contém tabelas:
// - 'products': cli_code, cli_cnpj, cli_desc, supp_code, supp_cnpj, supp_desc, user, date
// - 'schedule_list': id, number, nfe-key, client, case_count, date, status, historic (json), qt_prod
const dbcheckinPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'dbcheckin',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'utf8mb4',
  idleTimeout: 300000,
  maxIdle: 5,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Configuração do pool de conexões para dbmercocamp
// Contém tabela 'wcl' com: cnpj_cpf, nome
const dbmercocampPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'dbmercocamp',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'utf8mb4',
  idleTimeout: 300000,
  maxIdle: 5,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Função para testar ambas as conexões
const testConnections = async () => {
  try {
    // Testar conexão com dbusers
    const usersConnection = await dbusersPool.getConnection();
    console.log('✅ Conexão com dbusers estabelecida com sucesso');
    usersConnection.release();
    
    // Testar conexão com dbcheckin
    const checkinConnection = await dbcheckinPool.getConnection();
    console.log('✅ Conexão com dbcheckin estabelecida com sucesso');
    checkinConnection.release();
    
    // Testar conexão com dbmercocamp
    const mercocampConnection = await dbmercocampPool.getConnection();
    console.log('✅ Conexão com dbmercocamp estabelecida com sucesso');
    mercocampConnection.release();
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com os bancos de dados:', error.message);
    console.error('   Código do erro:', error.code);
    console.error('   Host:', process.env.DB_HOST);
    console.error('   Port:', process.env.DB_PORT);
    console.error('   User:', process.env.DB_USER);
    console.error('   Detalhes completos:', error);
    return false;
  }
};

// Função para executar queries no banco dbusers com retry
const executeUsersQuery = async (query, params = [], retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const [rows] = await dbusersPool.execute(query, params);
      return rows;
    } catch (error) {
      console.error(`Erro na query dbusers (tentativa ${attempt}/${retries}):`, error.message);
      
      // Se é erro de conexão e ainda temos tentativas
      if ((error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST' || 
           error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') && attempt < retries) {
        console.log(`⏳ Aguardando ${attempt * 1000}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      throw error;
    }
  }
};

// Função para executar queries no banco dbcheckin com retry
const executeCheckinQuery = async (query, params = [], retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const [rows] = await dbcheckinPool.execute(query, params);
      return rows;
    } catch (error) {
      console.error(`Erro na query dbcheckin (tentativa ${attempt}/${retries}):`, error.message);
      
      // Se é erro de conexão e ainda temos tentativas
      if ((error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST' || 
           error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') && attempt < retries) {
        console.log(`⏳ Aguardando ${attempt * 1000}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      throw error;
    }
  }
};

// Função para executar queries no banco dbmercocamp com retry
const executeMercocampQuery = async (query, params = [], retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const [rows] = await dbmercocampPool.execute(query, params);
      return rows;
    } catch (error) {
      console.error(`Erro na query dbmercocamp (tentativa ${attempt}/${retries}):`, error.message);
      
      // Se é erro de conexão e ainda temos tentativas
      if ((error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST' || 
           error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') && attempt < retries) {
        console.log(`⏳ Aguardando ${attempt * 1000}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      throw error;
    }
  }
};

// Função para transações no banco dbusers
const executeUsersTransaction = async (queries) => {
  const connection = await dbusersPool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Função para transações no banco dbcheckin
const executeCheckinTransaction = async (queries) => {
  const connection = await dbcheckinPool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Função para transações no banco dbmercocamp
const executeMercocampTransaction = async (queries) => {
  const connection = await dbmercocampPool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Função para transações entre os bancos (caso necessário)
const executeMultiDatabaseTransaction = async (usersQueries = [], checkinQueries = [], mercocampQueries = []) => {
  const usersConnection = await dbusersPool.getConnection();
  const checkinConnection = await dbcheckinPool.getConnection();
  const mercocampConnection = await dbmercocampPool.getConnection();
  
  try {
    await usersConnection.beginTransaction();
    await checkinConnection.beginTransaction();
    await mercocampConnection.beginTransaction();
    
    const results = {};
    
    // Executar queries no dbusers
    if (usersQueries.length > 0) {
      results.users = [];
      for (const { query, params } of usersQueries) {
        const [result] = await usersConnection.execute(query, params);
        results.users.push(result);
      }
    }
    
    // Executar queries no dbcheckin
    if (checkinQueries.length > 0) {
      results.checkin = [];
      for (const { query, params } of checkinQueries) {
        const [result] = await checkinConnection.execute(query, params);
        results.checkin.push(result);
      }
    }
    
    // Executar queries no dbmercocamp
    if (mercocampQueries.length > 0) {
      results.mercocamp = [];
      for (const { query, params } of mercocampQueries) {
        const [result] = await mercocampConnection.execute(query, params);
        results.mercocamp.push(result);
      }
    }
    
    await usersConnection.commit();
    await checkinConnection.commit();
    await mercocampConnection.commit();
    
    return results;
  } catch (error) {
    await usersConnection.rollback();
    await checkinConnection.rollback();
    await mercocampConnection.rollback();
    throw error;
  } finally {
    usersConnection.release();
    checkinConnection.release();
    mercocampConnection.release();
  }
};

module.exports = {
  // Pools de conexão
  dbusersPool,
  dbcheckinPool,
  dbmercocampPool,
  
  // Funções de teste
  testConnections,
  
  // Funções para execução de queries
  executeUsersQuery,
  executeCheckinQuery,
  executeMercocampQuery,
  
  // Funções para transações
  executeUsersTransaction,
  executeCheckinTransaction,
  executeMercocampTransaction,
  executeMultiDatabaseTransaction,
  
  // Funções legacy para compatibilidade (apontam para dbcheckin por padrão)
  pool: dbcheckinPool,
  testConnection: testConnections,
  executeQuery: executeCheckinQuery,
  executeTransaction: executeCheckinTransaction
}; 