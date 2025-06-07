FROM node:18-alpine

WORKDIR /app

# Casser le cache Docker
ARG CACHE_BUST=1

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer TOUTES les dépendances
RUN npm install

# Copier le code source
COPY . .

# Build de l'application
RUN npm run build

# Nettoyer les dev dependencies après le build
RUN npm prune --production

# Exposer le port
EXPOSE 5000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=5000

# Démarrer l'application
CMD ["npm", "start"]
