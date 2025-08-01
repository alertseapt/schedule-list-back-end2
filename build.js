#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configurações
const DIST_DIR = 'dist';
const ASSETS_DIR = 'assets';

// Função para criar diretório se não existir
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Função para copiar arquivo
function copyFile(src, dest) {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
}

// Função para minificar CSS
function minifyCSS(content) {
    return content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários
        .replace(/\s+/g, ' ') // Remove espaços extras
        .replace(/;\s*}/g, '}') // Remove ponto e vírgula antes de chaves
        .replace(/\s*{\s*/g, '{') // Remove espaços ao redor de chaves
        .replace(/\s*}\s*/g, '}') // Remove espaços ao redor de chaves
        .replace(/\s*;\s*/g, ';') // Remove espaços ao redor de ponto e vírgula
        .replace(/\s*:\s*/g, ':') // Remove espaços ao redor de dois pontos
        .replace(/\s*,\s*/g, ',') // Remove espaços ao redor de vírgulas
        .trim();
}

// Função para minificar JavaScript
function minifyJS(content) {
    // Minificação básica - remove comentários e espaços desnecessários
    return content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários de bloco
        .replace(/\/\/.*$/gm, '') // Remove comentários de linha
        .replace(/\s+/g, ' ') // Remove espaços extras
        .replace(/;\s*}/g, '}') // Remove ponto e vírgula antes de chaves
        .replace(/\s*{\s*/g, '{') // Remove espaços ao redor de chaves
        .replace(/\s*}\s*/g, '}') // Remove espaços ao redor de chaves
        .replace(/\s*;\s*/g, ';') // Remove espaços ao redor de ponto e vírgula
        .replace(/\s*:\s*/g, ':') // Remove espaços ao redor de dois pontos
        .replace(/\s*,\s*/g, ',') // Remove espaços ao redor de vírgulas
        .trim();
}

// Função para atualizar referências nos arquivos HTML
function updateHTMLReferences(content) {
    return content
        .replace(/assets\/css\/main\.css/g, 'assets/css/main.min.css')
        .replace(/assets\/css\/vue-components\.css/g, 'assets/css/vue-components.min.css')
        .replace(/assets\/css\/login\.css/g, 'assets/css/login.min.css')
        .replace(/assets\/js\/vue\/main\.js/g, 'assets/js/vue/main.min.js')
        .replace(/assets\/js\/login\.js/g, 'assets/js/login.min.js')
        .replace(/assets\/js\/auth-guard\.js/g, 'assets/js/auth-guard.min.js');
}

async function build() {
    console.log('🚀 Iniciando build do projeto LogiReceive...');
    
    try {
        // Limpar diretório dist
        if (fs.existsSync(DIST_DIR)) {
            fs.rmSync(DIST_DIR, { recursive: true });
            console.log('✅ Diretório dist limpo');
        }
        
        // Criar estrutura de diretórios
        ensureDir(DIST_DIR);
        ensureDir(path.join(DIST_DIR, 'assets', 'css'));
        ensureDir(path.join(DIST_DIR, 'assets', 'js', 'vue', 'components'));
        ensureDir(path.join(DIST_DIR, 'assets', 'img'));
        
        // Copiar e minificar arquivos CSS
        console.log('📦 Processando arquivos CSS...');
        const cssFiles = ['main.css', 'vue-components.css', 'login.css'];
        
        for (const file of cssFiles) {
            const srcPath = path.join(ASSETS_DIR, 'css', file);
            const destPath = path.join(DIST_DIR, ASSETS_DIR, 'css', file.replace('.css', '.min.css'));
            
            if (fs.existsSync(srcPath)) {
                const content = fs.readFileSync(srcPath, 'utf8');
                const minified = minifyCSS(content);
                fs.writeFileSync(destPath, minified);
                console.log(`   ✅ ${file} -> ${file.replace('.css', '.min.css')}`);
            }
        }
        
        // Copiar e minificar arquivos JavaScript
        console.log('📦 Processando arquivos JavaScript...');
        const jsFiles = [
            { src: 'auth-guard.js', dest: 'auth-guard.min.js' },
            { src: 'login.js', dest: 'login.min.js' },
            { src: 'vue/main.js', dest: 'vue/main.min.js' }
        ];
        
        for (const file of jsFiles) {
            const srcPath = path.join(ASSETS_DIR, 'js', file.src);
            const destPath = path.join(DIST_DIR, ASSETS_DIR, 'js', file.dest);
            
            if (fs.existsSync(srcPath)) {
                const content = fs.readFileSync(srcPath, 'utf8');
                const minified = minifyJS(content);
                fs.writeFileSync(destPath, minified);
                console.log(`   ✅ ${file.src} -> ${file.dest}`);
            }
        }
        
        // Copiar e minificar componentes Vue
        console.log('📦 Processando componentes Vue...');
        const componentsDir = path.join(ASSETS_DIR, 'js', 'vue', 'components');
        
        if (fs.existsSync(componentsDir)) {
            const componentFiles = fs.readdirSync(componentsDir);
            
            for (const file of componentFiles) {
                if (file.endsWith('.js')) {
                    const srcPath = path.join(componentsDir, file);
                    const destPath = path.join(DIST_DIR, ASSETS_DIR, 'js', 'vue', 'components', file.replace('.js', '.min.js'));
                    
                    const content = fs.readFileSync(srcPath, 'utf8');
                    const minified = minifyJS(content);
                    fs.writeFileSync(destPath, minified);
                    console.log(`   ✅ components/${file} -> components/${file.replace('.js', '.min.js')}`);
                }
            }
        }
        
        // Copiar imagens
        console.log('📦 Copiando imagens...');
        const imgDir = path.join(ASSETS_DIR, 'img');
        
        if (fs.existsSync(imgDir)) {
            const imgFiles = fs.readdirSync(imgDir);
            
            for (const file of imgFiles) {
                const srcPath = path.join(imgDir, file);
                const destPath = path.join(DIST_DIR, ASSETS_DIR, 'img', file);
                copyFile(srcPath, destPath);
                console.log(`   ✅ ${file}`);
            }
        }
        
        // Processar arquivos HTML
        console.log('📦 Processando arquivos HTML...');
        const htmlFiles = ['dashboard.html', 'login.html'];
        
        for (const file of htmlFiles) {
            if (fs.existsSync(file)) {
                let content = fs.readFileSync(file, 'utf8');
                
                // Atualizar referências para arquivos minificados
                content = updateHTMLReferences(content);
                
                // Atualizar referências dos componentes Vue
                content = content.replace(/assets\/js\/vue\/components\/(\w+)\.js/g, 'assets/js/vue/components/$1.min.js');
                
                fs.writeFileSync(path.join(DIST_DIR, file), content);
                console.log(`   ✅ ${file}`);
            }
        }
        
        // Copiar arquivos de configuração importantes
        console.log('📦 Copiando arquivos de configuração...');
        const configFiles = ['.gitignore', 'README.md', 'API_FRONTEND_DOCUMENTATION.md'];
        
        for (const file of configFiles) {
            if (fs.existsSync(file)) {
                copyFile(file, path.join(DIST_DIR, file));
                console.log(`   ✅ ${file}`);
            }
        }
        
        // Criar package.json para produção
        const prodPackage = {
            name: "logireceive-frontend",
            version: "1.0.0",
            description: "Sistema de Recebimento de Mercadorias - LogiReceive Frontend (Produção)",
            main: "dashboard.html",
            scripts: {
                "start": "npx serve -s . -l 80",
                "dev": "npx serve -s . -l 8000"
            },
            keywords: ["logistics", "warehouse", "vue", "frontend", "dashboard"],
            author: "LogiReceive Team",
            license: "MIT",
            dependencies: {
                "serve": "^14.2.0"
            }
        };
        
        fs.writeFileSync(path.join(DIST_DIR, 'package.json'), JSON.stringify(prodPackage, null, 2));
        console.log('   ✅ package.json (produção)');
        
        // Calcular tamanhos dos arquivos
        console.log('\n📊 Estatísticas da build:');
        
        function getFileSize(filePath) {
            try {
                const stats = fs.statSync(filePath);
                return (stats.size / 1024).toFixed(2) + ' KB';
            } catch (e) {
                return 'N/A';
            }
        }
        
        // Comparar tamanhos originais vs minificados
        const comparisons = [
            { original: 'assets/css/main.css', minified: 'dist/assets/css/main.min.css' },
            { original: 'assets/css/vue-components.css', minified: 'dist/assets/css/vue-components.min.css' },
            { original: 'assets/js/vue/main.js', minified: 'dist/assets/js/vue/main.min.js' },
            { original: 'assets/js/login.js', minified: 'dist/assets/js/login.min.js' }
        ];
        
        for (const comp of comparisons) {
            const originalSize = getFileSize(comp.original);
            const minifiedSize = getFileSize(comp.minified);
            console.log(`   ${path.basename(comp.original)}: ${originalSize} -> ${minifiedSize}`);
        }
        
        console.log('\n🎉 Build concluída com sucesso!');
        console.log(`📁 Arquivos de produção estão em: ${DIST_DIR}/`);
        console.log('🚀 Para executar em produção: cd dist && npm start');
        
    } catch (error) {
        console.error('❌ Erro durante a build:', error.message);
        process.exit(1);
    }
}

// Executar build
build(); 