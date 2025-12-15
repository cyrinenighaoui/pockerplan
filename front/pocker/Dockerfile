FROM node:20-alpine

# Dossier de travail dans le container
WORKDIR /app

# Copier les fichiers nécessaires
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code
COPY . .
RUN echo " BUILD FRONT DOCKER "

# Build du frontend
RUN npm run build

# Exposer le port Next.js
EXPOSE 3000

# Lancer Next.js
CMD ["npm", "run", "start"]
