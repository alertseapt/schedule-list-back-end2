FROM node:20-alpine

WORKDIR /app

# Criar diretório se não existir e copiar arquivos
COPY . /tmp/repo

# Verificar estrutura e copiar arquivos do backend
RUN if [ -d "/tmp/repo/Back-end" ]; then \
      cp /tmp/repo/Back-end/package*.json . && \
      npm install && \
      cp -r /tmp/repo/Back-end/* . ; \
    else \
      echo "Back-end directory not found, using root" && \
      cp /tmp/repo/package*.json . && \
      npm install && \
      cp -r /tmp/repo/* . ; \
    fi

# Limpar arquivos temporários
RUN rm -rf /tmp/repo

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]