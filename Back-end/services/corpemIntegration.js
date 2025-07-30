const axios = require('axios');

/**
 * Serviço de integração com Corpem WMS
 * 
 * Responsável por:
 * 1. Cadastro de Mercadorias (quando status = "Agendado")
 * 2. Integração de NF de Entrada (para todos os agendamentos)
 */
class CorpemIntegrationService {
  constructor() {
    // Configurações do Corpem WMS
    this.config = {
      baseURL: process.env.CORPEM_BASE_URL || 'http://webcorpem.no-ip.info:37560/scripts/mh.dll/wc',
      cnpjWms: process.env.CORPEM_CNPJ_WMS || '', // CNPJ do cliente WMS sem máscara
      token: process.env.CORPEM_TOKEN || '6cnc3', // Token de autenticação
      tokenHeader: process.env.CORPEM_TOKEN_HEADER || 'TOKEN_CP', // Nome do header do token
      timeout: 30000 // 30 segundos
    };

    // Configurar axios instance com headers limpos
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'TOKEN_CP': this.config.token || ''
      }
    });
  }

  /**
   * Registra um produto no WMS Corpem
   * Integração 01 - Cadastro de Mercadorias
   * 
   * @param {Object} scheduleData - Dados do agendamento
   * @returns {Promise<Object>} Resultado da integração
   */
  async registerProducts(scheduleData) {
    try {
      console.log('🟩 PRODUCTS INTEGRATION - Schedule ID:', scheduleData.id);

      if (!scheduleData.client?.trim()) {
        return { success: false, message: 'CNPJ do estoque é obrigatório para integração com Corpem' };
      }

      const products = this.extractProductsFromSchedule(scheduleData);
      
      if (!products || products.length === 0) {
        console.log('❌ Nenhum produto encontrado para cadastrar');
        return { success: false, message: 'Nenhum produto encontrado' };
      }

      console.log(`✅ Encontrados ${products.length} produtos para cadastrar`);

      // Mapear produtos para formato Corpem
      const corpemProducts = products.map((product, index) => {
        return this.mapProductToCorpem(product, scheduleData);
      });

      // Montar payload para Corpem
      const payload = {
        "CORPEM_ERP_MERC": {
          "CGCCLIWMS": scheduleData.client,
          "PRODUTOS": corpemProducts
        }
      };

      console.log(`📤 Enviando ${corpemProducts.length} produtos para Corpem`);
      
      const startTime = Date.now();
      const response = await this.axiosInstance.post('', payload);
      const duration = Date.now() - startTime;

      console.log(`📥 Resposta Corpem: ${response.status} (${duration}ms)`);

      // Log detalhado da requisição (formato detalhado)
      this.logCorpemRequest('POST', this.config.baseURL, payload, response, startTime, 'products', scheduleData.id);

      // Verificar resposta
      if (response.data.CORPEM_WS_OK === "OK") {
        console.log('✅ Produtos cadastrados com sucesso no Corpem');
        return { 
          success: true, 
          message: 'Produtos cadastrados com sucesso no Corpem WMS',
          data: response.data
        };
      } else {
        console.log('❌ Erro Corpem:', response.data.CORPEM_WS_ERRO);
        return { 
          success: false, 
          message: response.data.CORPEM_WS_ERRO || 'Erro desconhecido no Corpem',
          data: response.data
        };
      }

    } catch (error) {
      console.log('\n💥 EXCEPTION DURANTE INTEGRAÇÃO:');
      console.log('   Tipo do erro:', error.constructor.name);
      console.log('   Mensagem:', error.message);
      console.log('   Stack:', error.stack);
      
      if (error.response) {
        console.log('\n📥 RESPOSTA DE ERRO HTTP:');
        console.log('   Status:', error.response.status);
        console.log('   Status Text:', error.response.statusText);
        console.log('   Data:', JSON.stringify(error.response.data, null, 2));
        console.log('   Headers:', JSON.stringify(error.response.headers, null, 2));
      } else if (error.request) {
        console.log('\n🌐 ERRO DE REDE/TIMEOUT:');
        console.log('   Request config:', JSON.stringify(error.config, null, 2));
        console.log('   Possíveis causas:');
        console.log('   - Servidor Corpem fora do ar');
        console.log('   - Timeout de conexão');
        console.log('   - Problemas de DNS');
        console.log('   - Firewall bloqueando requisição');
      } else {
        console.log('\n⚙️ ERRO DE CONFIGURAÇÃO:');
        console.log('   Config:', JSON.stringify(error.config, null, 2));
      }
      
      // Log da requisição com erro
      if (error.config) {
        const startTime = Date.now() - 30000; // Aproximação para mostrar que houve erro
        this.logCorpemRequest(
          error.config.method?.toUpperCase() || 'POST',
          error.config.url || this.config.baseURL,
          error.config.data ? JSON.parse(error.config.data) : {},
          error.response || null,
          startTime,
          'products',
          scheduleData.id
        );
      }
      
      console.log('='.repeat(80) + '\n');
      return { 
        success: false, 
        message: `Erro na integração: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Integra NF de entrada no WMS Corpem
   * Integração 02 - NF de Entrada (DP de Entrada)
   * 
   * @param {Object} scheduleData - Dados do agendamento
   * @returns {Promise<Object>} Resultado da integração
   */
  async registerNfEntry(scheduleData) {
    try {
      console.log('🟦 NF INTEGRATION - Schedule ID:', scheduleData.id);

      if (!scheduleData.client?.trim()) {
        return { success: false, message: 'CNPJ do estoque é obrigatório' };
      }

      const nfeData = this.extractNfeDataFromSchedule(scheduleData);
      const products = this.extractProductsFromSchedule(scheduleData);
      const supplierCnpj = this.extractSupplierCnpj(scheduleData);

      if (!nfeData || !products?.length) {
        console.log('❌ Dados insuficientes para NF');
        return { success: false, message: 'Dados da NFe/Produtos não encontrados' };
      }
      
      // Extrair dados da estrutura NFe (seguindo padrão do repo funcionando)
      let info = scheduleData.info;
      if (typeof info === 'string') {
        info = JSON.parse(info);
      }

      const ide = info?.ide || {};
      const emit = info?.emit || {};
      
      // CORREÇÕES BASEADAS NO REPO FUNCIONANDO:
      const totalValue = nfeData.totalValue || this.calculateTotalValue(products);
      const formattedDate = this.formatDateToDDMMYYYY(ide.dhEmi || scheduleData.date); // Usar dhEmi da NFe
      const cleanedCgcrem = this.extractSupplierCnpj(scheduleData); // Usar função correta para extrair CNPJ
      const numericNumnf = String(ide?.nNF || scheduleData.number).replace(/\D/g, '') || '123456'; // Usar nNF da NFe
      const serieNf = ide?.serie || '1'; // Usar série da NFe
      const validChavenf = scheduleData.nfe_key || scheduleData.chave_nfe || 
        `35${new Date().getFullYear().toString().substring(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${scheduleData.client}55001000000${numericNumnf.padStart(9, '0')}`;

      console.log('✅ Total Value:', totalValue);
      console.log('✅ Date (dhEmi):', formattedDate);
      console.log('✅ CGCREM (cleaned):', cleanedCgcrem);
      console.log('✅ NUMNF (from nNF):', numericNumnf);
      console.log('✅ SERIENF (from serie):', serieNf);
      console.log('✅ CHAVENF:', validChavenf, '(length:', validChavenf?.length, ')');

      // 3. MAPEAR PRODUTOS
      console.log('\n🔍 STEP 3: MAPEANDO PRODUTOS');
      const corpemProducts = products.map((product, index) => {
        const mapped = this.mapProductToCorpemNfEntry(product, index + 1);
        console.log(`✅ Produto ${index + 1}: ${mapped.CODPROD} (${mapped.QTPROD}x ${mapped.VLTOTPROD})`);
        return mapped;
      });

      // 4. MONTAR PAYLOAD FINAL (SEGUINDO PADRÃO DO REPO FUNCIONANDO)
      console.log('\n🔍 STEP 4: MONTANDO PAYLOAD CORPEM');
      const payload = {
        "CORPEM_ERP_DOC_ENT": {
          "CGCCLIWMS": scheduleData.client, // CNPJ do destinatário
          "CGCREM": cleanedCgcrem, // CNPJ do emitente limpo (SEM MÁSCARA)
          "OBSRESDP": `N.F.: ${numericNumnf}`, // Observação
          "TPDESTNF": "2", // Tipo destino NF (fixo)
          "DEV": "0", // Não é devolução (fixo)
          "NUMNF": String(numericNumnf), // Número da NF (da tag nNF)
          "SERIENF": String(serieNf), // Série da NF (da tag serie)
          "DTEMINF": formattedDate, // Data emissão (da tag dhEmi)
          "VLTOTALNF": String(totalValue), // Valor total
          "NUMEPEDCLI": `N.F. ${numericNumnf}`, // CORREÇÃO: Seguir padrão do repo
          "CHAVENF": validChavenf, // Chave da NFe
          "CHAVENF_DEV": "", // Chave devolução (vazio)
          "ITENS": corpemProducts // Itens da NF
        }
      };

      // LOG DOS PRINCIPAIS CAMPOS PARA DEBUG DO ERROR 999
      console.log('\n🚨 PAYLOAD FINAL - CAMPOS CRÍTICOS:');
      console.log('   CGCCLIWMS (Cliente):', payload.CORPEM_ERP_DOC_ENT.CGCCLIWMS);
      console.log('   CGCREM (Fornecedor):', payload.CORPEM_ERP_DOC_ENT.CGCREM);
      console.log('   NUMNF:', payload.CORPEM_ERP_DOC_ENT.NUMNF, '(type:', typeof payload.CORPEM_ERP_DOC_ENT.NUMNF, ')');
      console.log('   CHAVENF:', payload.CORPEM_ERP_DOC_ENT.CHAVENF, '(length:', payload.CORPEM_ERP_DOC_ENT.CHAVENF?.length, ')');
      console.log('   VLTOTALNF:', payload.CORPEM_ERP_DOC_ENT.VLTOTALNF, '(type:', typeof payload.CORPEM_ERP_DOC_ENT.VLTOTALNF, ')');
      console.log('   DTEMINF:', payload.CORPEM_ERP_DOC_ENT.DTEMINF);
      console.log('   ITENS Count:', payload.CORPEM_ERP_DOC_ENT.ITENS?.length);
      
      // Validar produtos individualmente
      payload.CORPEM_ERP_DOC_ENT.ITENS?.forEach((item, i) => {
        console.log(`   Item ${i+1}: ${item.CODPROD} (${item.QTPROD}x ${item.VLTOTPROD})`);
      });

      // LOG COMPLETO DO JSON DA REQUISIÇÃO
      console.log('\n📄 JSON COMPLETO DA REQUISIÇÃO:');
      console.log('================================================================================');
      console.log(JSON.stringify(payload, null, 2));
      console.log('================================================================================');

      // 5. EXECUTAR REQUISIÇÃO
      console.log('\n🔍 STEP 5: ENVIANDO PARA CORPEM');
      console.log('📡 URL:', this.config.baseURL);
      console.log('🔑 Token Length:', this.config.token?.length || 0);
      
      const startTime = Date.now();
      const response = await this.axiosInstance.post('', payload);
      const duration = Date.now() - startTime;

      // 6. ANALISAR RESPOSTA
      console.log('\n🔍 STEP 6: RESPOSTA CORPEM');
      console.log('⏱️ Duração:', duration + 'ms');
      console.log('📊 Status:', response.status);
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));

      // 7. ANÁLISE DO RESULTADO
      if (response.data.CORPEM_WS_OK === "OK") {
        console.log('\n🎉 SUCCESS: NF integrada com sucesso!');
        console.log('🟦'.repeat(60));
        return { 
          success: true, 
          message: 'NF de entrada integrada com sucesso no Corpem WMS',
          data: response.data
        };
      } else {
        console.log('\n🚨 ERROR 999 ANALYSIS:');
        console.log('❌ Erro:', response.data.CORPEM_WS_ERRO);
        
        // ANÁLISE DETALHADA PARA DEBUG DO ERRO 999
        console.log('\n🕵️ DEBUGGING ERROR 999:');
        console.log('📊 Tipo de erro:', response.data.CORPEM_WS_ERRO?.includes('999') ? 'ERRO GENÉRICO 999' : 'ERRO ESPECÍFICO');
        console.log('📊 Cliente CNPJ válido:', scheduleData.client === '27630772000244' ? 'SIM' : 'NÃO');
        console.log('📊 Fornecedor CNPJ válido:', (supplierCnpj === '27630772000244' || supplierCnpj === '99999999999999') ? 'SIM' : 'NÃO');
        console.log('📊 NUMNF format:', /^\d+$/.test(numericNumnf) ? 'NUMÉRICO OK' : 'INVÁLIDO');
        console.log('📊 CHAVENF length:', validChavenf?.length, validChavenf?.length === 44 ? 'OK' : 'INVÁLIDO');
        console.log('📊 Total produtos:', corpemProducts?.length || 0);
        
        // Verificar se produtos existem
        console.log('\n🔍 PRODUTOS VALIDATION:');
        corpemProducts?.forEach((item, i) => {
          const hasRequiredFields = item.CODPROD && item.QTPROD && item.VLTOTPROD;
          console.log(`   Produto ${i+1}: ${item.CODPROD} - ${hasRequiredFields ? 'OK' : 'MISSING FIELDS'}`);
        });
        
        console.log('\n💡 POSSIBLE CAUSES FOR ERROR 999:');
        console.log('   1. Produto não cadastrado no sistema (necessário cadastrar primeiro)');
        console.log('   2. NF já existe com mesmo número/chave');
        console.log('   3. Data/valor inválido para validações internas');
        console.log('   4. CNPJ fornecedor não autorizado para este cliente');
        console.log('   5. Chave NFe com formato válido mas dados inconsistentes');
        
        console.log('🟦'.repeat(60));
        return { 
          success: false, 
          message: response.data.CORPEM_WS_ERRO || 'Erro desconhecido no Corpem',
          data: response.data
        };
      }

    } catch (error) {
      console.error('❌ Erro na integração de NF de entrada com Corpem:', error);
      
      // Log da requisição com erro
      if (error.config) {
        const startTime = Date.now() - 30000; // Aproximação para mostrar que houve erro
        this.logCorpemRequest(
          error.config.method?.toUpperCase() || 'POST',
          error.config.url || this.config.baseURL,
          error.config.data ? JSON.parse(error.config.data) : {},
          error.response || null,
          startTime,
          'nf_entry',
          scheduleData.id
        );
      }
      
      return { 
        success: false, 
        message: `Erro na integração: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Extrai produtos do agendamento
   * @param {Object} scheduleData 
   * @returns {Array} Lista de produtos
   */
  extractProductsFromSchedule(scheduleData) {
    try {
      let products = [];

      // Tentar extrair do campo info.products
      if (scheduleData.info && scheduleData.info.products && Array.isArray(scheduleData.info.products)) {
        products = scheduleData.info.products;
      }
      // Fallback: se info for string, tentar parsear
      else if (scheduleData.info && typeof scheduleData.info === 'string') {
        const parsedInfo = JSON.parse(scheduleData.info);
        if (parsedInfo.products && Array.isArray(parsedInfo.products)) {
          products = parsedInfo.products;
        }
      }

      console.log(`📦 Encontrados ${products.length} produtos no agendamento`);
      return products;

    } catch (error) {
      console.error('Erro ao extrair produtos:', error);
      return [];
    }
  }

  /**
   * Extrai dados da NFe do agendamento
   * @param {Object} scheduleData 
   * @returns {Object} Dados da NFe
   */
  extractNfeDataFromSchedule(scheduleData) {
    try {
      let info = scheduleData.info;
      
      if (typeof info === 'string') {
        info = JSON.parse(info);
      }

      // Extrair dados específicos da estrutura da NFe
      const nfeData = {
        serie: info.ide?.serie || "1",
        totalValue: info.total?.ICMSTot?.vNF || info.total?.ICMSTot?.vProd || null,
        emissionDate: info.ide?.dhEmi || scheduleData.date,
        supplierCnpj: this.extractSupplierCnpj(scheduleData),
        supplierName: info.emit?.xNome || scheduleData.supplier
      };

      return nfeData;

    } catch (error) {
      console.error('Erro ao extrair dados da NFe:', error);
      return null;
    }
  }

  /**
   * Mapeia produto para formato Corpem (Cadastro de Mercadorias)
   * @param {Object} product 
   * @param {Object} scheduleData 
   * @returns {Object} Produto no formato Corpem
   */
  mapProductToCorpem(product, scheduleData) {
    // Usar código de venda do usuário (client_code) - campo correto da aba Produtos da NFe
    const productCode = product.client_code || product.cli_code || product.supplier_code || product.code || `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Usar descrição de venda do usuário (client_description) - campo correto da aba Produtos da NFe
    const productName = product.client_description || product.cli_desc || product.supplier_description || product.description || 'Produto sem descrição';

    return {
      "CODPROD": productCode,
      "NOMEPROD": productName.substring(0, 100), // Máximo 100 caracteres
      "IWS_ERP": "1",
      "TPOLRET": "1", // FIFO
      "IAUTODTVEN": "0",
      "QTDDPZOVEN": "",
      "ILOTFAB": "0",
      "IDTFAB": "0", 
      "IDTVEN": "0",
      "INSER": "0",
      "SEM_LOTE_CKO": "0",
      "SEM_DTVEN_CKO": "0",
      "CODFAB": product.supp_code || product.supplier_code || "",
      "NOMEFAB": (product.supp_desc || product.supplier_description || scheduleData.supplier || "").substring(0, 100),
      "CODGRU": "",
      "NOMEGRU": "",
      "CODPROD_FORN": product.supp_code || product.supplier_code || "",
      "NCM": (product.ncm || "").replace(/[^0-9]/g, '').padEnd(8, '0').substring(0, 8),
      "EMBALAGENS": [
        {
          "CODUNID": product.unit || "UN",
          "FATOR": "1",
          "CODBARRA": product.ean_code || "",
          "PESOLIQ": "",
          "PESOBRU": "",
          "ALT": "",
          "LAR": "",
          "COMP": "",
          "VOL": "",
          "IEMB_ENT": "1",
          "IEMB_SAI": "1"
        }
      ]
    };
  }

  /**
   * Mapeia produto para formato Corpem (NF de Entrada)
   * @param {Object} product 
   * @param {Number} sequence 
   * @returns {Object} Item no formato Corpem
   */
  mapProductToCorpemNfEntry(product, sequence) {
    // Usar código de venda do usuário (client_code) - campo correto da aba Produtos da NFe
    const productCode = product.client_code || product.cli_code || product.supplier_code || product.code || `PROD_${sequence}`;
    
    return {
      "NUMSEQ": String(sequence),
      "CODPROD": productCode,
      "QTPROD": String(product.quantity || 1),
      "VLTOTPROD": String(product.total_value || (product.unit_value * product.quantity) || 0),
      "NUMPED_COMPRA": "",
      "LOTFAB": "",
      "DTVEN": "",
      "NUMSEQ_DEV": ""
    };
  }

  /**
   * Extrai CNPJ do fornecedor
   * @param {Object} scheduleData 
   * @returns {String} CNPJ do fornecedor
   */
  extractSupplierCnpj(scheduleData) {
    try {
      console.log('🔍 DEBUG Corpem extractSupplierCnpj:');
      console.log('   scheduleData.info type:', typeof scheduleData.info);
      
      let info = scheduleData.info;
      
      if (typeof info === 'string') {
        info = JSON.parse(info);
        console.log('   info parseado de string para Corpem');
      }

      console.log('   info existe:', !!info);
      console.log('   info.emit existe:', !!info?.emit);
      console.log('   info.emit.CNPJ:', info?.emit?.CNPJ);

      // Tentar diferentes formas de acessar o CNPJ
      let supplierCnpj = info?.emit?.CNPJ || info?.emit?.cnpj || info?.supplier_cnpj || info?.CNPJ || info?.cnpj;
      
      console.log('   CNPJ bruto extraído Corpem:', supplierCnpj);
      console.log('   info.supplier_cnpj:', info?.supplier_cnpj);
      
      // Limpar CNPJ (remover máscaras)
      if (supplierCnpj) {
        supplierCnpj = String(supplierCnpj).replace(/[^\d]/g, '');
        console.log('   CNPJ limpo Corpem:', supplierCnpj, 'length:', supplierCnpj.length);
        
        if (supplierCnpj.length === 14) {
          console.log(`✅ CNPJ fornecedor Corpem: ${supplierCnpj}`);
          return supplierCnpj;
        }
      }
      
      console.log(`⚠️ CNPJ fornecedor não encontrado, usando padrão Corpem`);
      return "99999999999999"; // Padrão Corpem para fornecedor

    } catch (error) {
      console.error('❌ Erro ao extrair CNPJ do fornecedor:', error);
      return "99999999999999"; // Padrão Corpem para fornecedor
    }
  }

  /**
   * Calcula valor total dos produtos
   * @param {Array} products 
   * @returns {Number} Valor total
   */
  calculateTotalValue(products) {
    return products.reduce((total, product) => {
      return total + (product.total_value || (product.unit_value * product.quantity) || 0);
    }, 0);
  }

  /**
   * Formata data para formato DD/MM/YYYY
   * @param {String} dateString 
   * @returns {String} Data formatada
   */
  formatDateToDDMMYYYY(dateString) {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return new Date().toLocaleDateString('pt-BR');
    }
  }

  /**
   * Logs detalhados das requisições HTTP para Corpem API
   * @param {String} method - Método HTTP
   * @param {String} url - URL da requisição
   * @param {Object} requestData - Dados da requisição
   * @param {Object} response - Resposta da API
   * @param {Number} startTime - Timestamp do início da requisição
   * @param {String} integrationType - Tipo de integração
   * @param {Number} scheduleId - ID do agendamento
   */
  logCorpemRequest(method, url, requestData, response = null, startTime, integrationType, scheduleId = null) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log(`🌐 CORPEM API REQUEST LOG - ${integrationType.toUpperCase()}`);
    console.log('='.repeat(80));
    
    // Informações básicas
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`⏱️  Duração: ${duration}ms`);
    if (scheduleId) console.log(`📋 Schedule ID: ${scheduleId}`);
    console.log(`🔧 Tipo de Integração: ${integrationType}`);
    
    // Request details
    console.log('\n📤 REQUEST DETAILS:');
    console.log(`   Método: ${method}`);
    console.log(`   URL: ${url}`);
    console.log('   Headers:');
    console.log('     Content-Type: application/json');
    console.log('     TOKEN_CP:', this.config.token ? `"${this.config.token}"` : '""');
    console.log(`   Payload:`);
    console.log(JSON.stringify(requestData, null, 2));
    
    // Response details
    if (response) {
      console.log('\n📥 RESPONSE DETAILS:');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Headers: ${JSON.stringify(response.headers, null, 2)}`);
      console.log(`   Body:`);
      console.log(JSON.stringify(response.data, null, 2));
      
      // Status summary
      const isSuccess = response.data.CORPEM_WS_OK === "OK";
      console.log(`\n${isSuccess ? '✅' : '❌'} Status: ${isSuccess ? 'SUCESSO' : 'ERRO'}`);
      
      if (!isSuccess && response.data.CORPEM_WS_ERRO) {
        console.log(`🚨 Erro Corpem: ${response.data.CORPEM_WS_ERRO}`);
      }
    } else {
      console.log('\n❌ RESPONSE: Requisição falhou antes de receber resposta');
    }
    
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Verifica se as configurações estão válidas
   * @returns {Boolean} True se configurações válidas
   */
  isConfigValid() {
    const isValid = !!(this.config.baseURL);
    
    if (!isValid) {
      console.log('❌ Configuração Corpem inválida:');
      console.log('   Base URL:', this.config.baseURL || 'NÃO CONFIGURADO');
    }
    
    // Log de aviso sobre token
    if (!this.config.token || this.config.token.trim() === '') {
      console.log('⚠️ AVISO: Token Corpem não configurado - requisições podem falhar');
      console.log('   Configure CORPEM_TOKEN no arquivo .env');
    }
    
    return isValid;
  }

  /**
   * Testa conectividade com Corpem
   * @returns {Promise<Object>} Resultado do teste
   */
  async testConnection() {
    try {
      if (!this.isConfigValid()) {
        return { 
          success: false, 
          message: 'Configurações do Corpem incompletas (CNPJ WMS ou URL)' 
        };
      }

      // Fazer uma consulta simples de estoque para testar conectividade
      // Para teste de conexão, usar o CNPJ padrão do WMS (ambiente)
      const payload = {
        "CORPEM_ERP_ESTOQUE": {
          "CGCCLIWMS": this.config.cnpjWms
        }
      };

      const startTime = Date.now();
      const response = await this.axiosInstance.post('', payload);

      // Log detalhado da requisição
      this.logCorpemRequest('POST', this.config.baseURL, payload, response, startTime, 'test_connection');

      if (response.data.CORPEM_WS_OK || response.data.CORPEM_ERP_ESTOQUE) {
        return { 
          success: true, 
          message: 'Conexão com Corpem WMS estabelecida com sucesso',
          data: response.data 
        };
      } else {
        return { 
          success: false, 
          message: response.data.CORPEM_WS_ERRO || 'Erro na conexão com Corpem',
          data: response.data 
        };
      }

    } catch (error) {
      console.error('Erro ao testar conexão com Corpem:', error);
      
      // Log da requisição com erro
      if (error.config) {
        const startTime = Date.now() - 30000; // Aproximação para mostrar que houve erro
        this.logCorpemRequest(
          error.config.method?.toUpperCase() || 'POST',
          error.config.url || this.config.baseURL,
          error.config.data ? JSON.parse(error.config.data) : {},
          error.response || null,
          startTime,
          'test_connection'
        );
      }
      
      return { 
        success: false, 
        message: `Erro na conexão: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new CorpemIntegrationService();