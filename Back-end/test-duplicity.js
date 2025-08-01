const { executeCheckinQuery } = require('./config/database');

async function testDuplicity() {
  try {
    // Substitua pela chave NFe que você está tentando agendar
    const nfeKey = 'SUA_CHAVE_NFE_AQUI'; // Coloque aqui a chave de 44 dígitos
    
    console.log('🔍 Testando verificação de duplicidade...');
    console.log('Chave NFe:', nfeKey);
    
    // Teste 1: Busca exata
    const exactResults = await executeCheckinQuery(
      'SELECT id, nfe_key, status, client, number FROM schedule_list WHERE nfe_key = ?',
      [nfeKey]
    );
    
    console.log('\n📊 Busca exata:');
    console.log('Resultados encontrados:', exactResults.length);
    exactResults.forEach(schedule => {
      console.log(`  ID: ${schedule.id}, Status: ${schedule.status}, Cliente: ${schedule.client}`);
    });
    
    // Teste 2: Busca com limpeza (nova implementação)
    const cleanNfeKey = nfeKey.toString().trim().replace(/[^\d]/g, '');
    const cleanResults = await executeCheckinQuery(
      'SELECT id, nfe_key, status, client, number FROM schedule_list WHERE REPLACE(REPLACE(nfe_key, " ", ""), "-", "") = ?',
      [cleanNfeKey]
    );
    
    console.log('\n📊 Busca com limpeza:');
    console.log('Chave limpa:', cleanNfeKey);
    console.log('Resultados encontrados:', cleanResults.length);
    cleanResults.forEach(schedule => {
      console.log(`  ID: ${schedule.id}, Status: ${schedule.status}, Cliente: ${schedule.client}`);
    });
    
    // Teste 3: Ver todas as chaves parecidas
    const similarResults = await executeCheckinQuery(
      'SELECT id, nfe_key, status, client, number FROM schedule_list WHERE nfe_key LIKE ?',
      [`%${cleanNfeKey.substring(10, 30)}%`]
    );
    
    console.log('\n📊 Chaves similares:');
    console.log('Resultados encontrados:', similarResults.length);
    similarResults.forEach(schedule => {
      console.log(`  ID: ${schedule.id}, NFe: ${schedule.nfe_key}, Status: ${schedule.status}`);
    });
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
  
  process.exit(0);
}

testDuplicity();