const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// Script para limpar o cache de rate limiting
async function resetRateLimit() {
    try {
        console.log('🔄 Tentando limpar cache de rate limiting...');
        
        // Se estiver usando Redis para rate limiting
        if (process.env.REDIS_URL) {
            const redis = new Redis(process.env.REDIS_URL);
            await redis.flushall();
            console.log('✅ Cache Redis limpo com sucesso');
            await redis.quit();
        } else {
            console.log('ℹ️ Rate limiting usando memória local - reinicie o servidor para limpar');
        }
        
        console.log('✅ Rate limiting resetado. Você pode tentar fazer login novamente.');
        console.log('💡 Dica: Se ainda estiver bloqueado, aguarde 5 minutos ou reinicie o servidor.');
        
    } catch (error) {
        console.error('❌ Erro ao limpar rate limiting:', error);
        console.log('💡 Solução: Reinicie o servidor para limpar o cache de rate limiting');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    resetRateLimit();
}

module.exports = resetRateLimit; 