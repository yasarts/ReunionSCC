FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (avec npm install pour regénérer le lock)
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
