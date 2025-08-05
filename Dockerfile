FROM node:20-alpine

WORKDIR /app

# Copiar package.json e instalar dependências
COPY Back-end/package*.json ./
RUN npm install

# Copiar código da aplicação
COPY Back-end/ .

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]