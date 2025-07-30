# Serviço de Verificação de DP (Documento de Portaria)

## Visão Geral

O Serviço de Verificação de DP é responsável por automaticamente buscar e atribuir números de Documento de Portaria (DP) aos agendamentos que ainda não possuem essa informação.

**Versão 2.0** - Agora utiliza apenas verificação via tabela WTR do banco de dados `dbmercocamp`.

## Como Funciona

### Fluxo Principal

1. **Busca Agendamentos**: Localiza agendamentos sem DP atribuído (`no_dp` é null/vazio)
2. **Extração de Dados**: Para cada agendamento, extrai:
   - Número da NF (`number` ou `info.ide.nNF`)
   - Número do cliente (`client`)
3. **Consulta WTR**: Busca na tabela `wtr` do `dbmercocamp` usando múltiplas estratégias
4. **Atribuição**: Se encontrado, atualiza o campo `no_dp` na tabela `schedule_list`

### Estratégias de Busca na Tabela WTR

#### 1. Consulta Exata
```sql
SELECT no_dp, no_nf, no_cli 
FROM wtr 
WHERE no_nf = ? AND no_cli = ?
AND no_dp IS NOT NULL 
```

#### 2. Consulta Flexível
```sql
SELECT no_dp, no_nf, no_cli 
FROM wtr 
WHERE no_nf = ?
AND no_dp IS NOT NULL
```

#### 3. Consulta Permissiva
```sql
SELECT no_dp, no_nf, no_cli 
FROM wtr 
WHERE CAST(no_nf AS CHAR) = ?
AND no_dp IS NOT NULL
```

#### 4. Estruturas Alternativas
Tenta diferentes nomes de colunas:
- `dp`, `nf`, `cli`
- `numero_dp`, `numero_nf`, `numero_cliente`
- `documento_portaria`, `nota_fiscal`, `cliente`
- `dp_number`, `nf_number`, `client_number`

#### 5. Detecção Inteligente
Usa `DESCRIBE wtr` para identificar colunas dinamicamente baseado em palavras-chave.

## Instalação

### 1. Executar Script SQL
```bash
# Adicionar coluna no_dp à tabela schedule_list
mysql -u usuario -p dbcheckin < sql/add_no_dp_column.sql
```

### 2. Verificar Integração
O serviço é iniciado automaticamente com o aplicativo no `app.js`.

## API Endpoints

### Controle do Serviço

#### `POST /api/dp-verification/start`
Inicia o serviço de verificação periódica.

**Resposta:**
```json
{
  "success": true,
  "message": "Serviço de verificação de DP iniciado com sucesso",
  "status": {
    "isRunning": true,
    "interval": 5000,
    "nextRun": "2025-01-25T10:30:00.000Z"
  }
}
```

#### `POST /api/dp-verification/stop`
Para o serviço de verificação periódica.

#### `GET /api/dp-verification/status`
Verifica status atual do serviço.

#### `POST /api/dp-verification/force/:scheduleId`
Força verificação manual de um agendamento específico.

### Verificação Manual

#### `POST /api/dp-verification/verify`
Executa uma verificação única de todos os agendamentos pendentes.

## Estrutura de Dados

### Tabela `schedule_list` (dbcheckin)
```sql
ALTER TABLE schedule_list 
ADD COLUMN no_dp VARCHAR(50) NULL 
COMMENT 'Número do Documento de Portaria (DP) obtido da tabela wtr do dbmercocamp';
```

### Tabela `wtr` (dbmercocamp)
Tabela de origem dos números de DP. Pode conter variações nos nomes das colunas:
- `no_dp` / `dp` / `numero_dp` / `documento_portaria`
- `no_nf` / `nf` / `numero_nf` / `nota_fiscal`  
- `no_cli` / `cli` / `numero_cliente` / `cliente`

## Logs e Monitoramento

### Logs Principais
```
🔍 Iniciando verificação de DP...
📋 Encontrados X agendamentos para verificação
✅ DP XXXX atribuído ao agendamento YY (NF: ZZZZ)
❌ DP não encontrado para NF XXXX
```

### Logs de Debug
```
📄 Verificando NF: XXXX, Cliente: YYYY
🔍 Tentando estrutura: dp=no_dp, nf=no_nf, cli=no_cli
✅ DP encontrado com estrutura alternativa: XXXX
📋 Colunas disponíveis na tabela wtr: col1, col2, col3
```

## Configurações

### Variáveis de Ambiente
```env
# Intervalo de verificação (em milissegundos)
DP_VERIFICATION_INTERVAL=5000  # Padrão: 5 segundos
```

### Configurações Internas
```javascript
// Em dpVerificationService.js
VERIFICATION_INTERVAL: 5 * 1000  // 5 segundos
RETRY_ATTEMPTS: 3                 // Tentativas por query
```

## Solução de Problemas

### Problemas Comuns

#### 1. "Unknown column" na tabela WTR
**Causa**: Estrutura da tabela WTR diferente do esperado
**Solução**: O serviço usa detecção automática de colunas

#### 2. DP não encontrado
**Possíveis causas**:
- NF não existe na tabela WTR
- Cliente não corresponde
- DP já foi processado anteriormente
- Estrutura de dados inconsistente

#### 3. Agendamentos não sendo processados
**Verificar**:
- Serviço está rodando: `GET /api/dp-verification/status`
- Logs do console para erros
- Conexão com banco `dbmercocamp`

### Debug Avançado

#### Verificação Manual
```bash
# Executar verificação única
curl -X POST http://localhost:3000/api/dp-verification/verify

# Verificar agendamento específico  
curl -X POST http://localhost:3000/api/dp-verification/force/123
```

#### Consultas SQL Diretas
```sql
-- Verificar agendamentos sem DP
SELECT id, number, client, no_dp 
FROM schedule_list 
WHERE (no_dp IS NULL OR no_dp = '' OR no_dp = '0')
AND number IS NOT NULL 
AND client IS NOT NULL;

-- Verificar dados na tabela WTR
SELECT * FROM wtr WHERE no_nf = '2581033' LIMIT 5;
DESCRIBE wtr;
```

## Segurança

### Autenticação
- Todos os endpoints protegidos por JWT
- Requer privilégios de administrador

### Validação
- Sanitização de entradas SQL
- Prepared statements para prevenir SQL injection
- Timeout configurável para queries

## Deploy

### Checklist Pré-Deploy
- [ ] Script SQL executado
- [ ] Conexão com `dbmercocamp` testada
- [ ] Estrutura da tabela `wtr` verificada
- [ ] Logs monitorados
- [ ] Endpoints testados

### Monitoramento Produção
- Verificar logs regularmente
- Monitorar status via endpoint `/status`
- Acompanhar taxa de sucesso de DPs encontrados

## Changelog

### v2.0 - Apenas Tabela WTR
- ❌ Removida verificação via logs do Corpem
- ✅ Mantida apenas busca na tabela WTR
- ✅ Melhorada detecção de estruturas alternativas
- ✅ Adicionada detecção inteligente de colunas

### v1.0 - Versão Inicial
- ✅ Verificação via logs Corpem + tabela WTR
- ✅ API endpoints básicos
- ✅ Documentação inicial