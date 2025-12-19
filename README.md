#  Planning Poker – Application Dockerisée

##  Vidéo de démonstration

 **Démonstration complète de l’application**, incluant :
- création de salle
- votes en temps réel
- gestion de la pause café
- système de chat
- Dashboard Admin

🔗 **Voir la vidéo de démonstration** :  
[https://github.com/cyrinenighaoui/pockerplan/issues/4 ](https://github.com/cyrinenighaoui/pockerplan/issues/4#issue-3731505960 )

⚠️ **REMARQUE IMPORTANTE AVANT LE TEST (À LIRE)**

Pour tester correctement plusieurs utilisateurs / sessions en parallèle :

- Ouvrir des navigateurs DIFFERENTS (ex : Chrome + Firefox)
  ou Navigation normale + Navigation privée
- NE PAS utiliser plusieurs onglets du même navigateur

Pourquoi ?
L’application utilise des sessions, cookies et des WebSockets.
Plusieurs onglets du même navigateur partagent la même session,
ce qui peut provoquer des comportements inattendus
(votes partagés, conflits d’état, bugs d’affichage).

✅ L’utilisation de navigateurs distincts garantit un test correct
du mode multi-utilisateur.


------------------------------------------------------------

PRÉSENTATION DU PROJET

Cette application est une plateforme de Planning Poker permettant
à une équipe agile d’estimer des fonctionnalités de manière
collaborative grâce à des votes en temps réel.

Le projet est entièrement dockerisé afin de garantir
un déploiement simple, reproductible et indépendant
de l’environnement local.


------------------------------------------------------------
📄 Le rapport final du projet est disponible à la racine du dépôt : Rapport_Planning_Poker.pdf
------------------------------------------------------------

ARCHITECTURE TECHNIQUE

Frontend :
- Next.js (React)
- Mode production (next build + next start)
- Accessible via le port 3000

Backend :
- Django + Django Channels
- WebSockets via Daphne (serveur ASGI)
- Accessible via le port 8000

Communication temps réel :
- WebSockets pour la gestion des sessions et des votes


------------------------------------------------------------

ARCHITECTURE DOCKER

Le projet utilise Docker Compose avec deux services :

- frontend : application Next.js
- backend  : application Django + Daphne

Chaque service possède son propre Dockerfile.


------------------------------------------------------------

STRUCTURE DU PROJET

```bash
PORJETPOCKERFINAL/
|
|-- docker-compose.yml
|
|-- BACK/
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- ...
|
|-- front/
    |-- pocker/
        |-- Dockerfile
        |-- package.json
        |-- next.config.js
        |-- src/
```

------------------------------------------------------------

PRÉREQUIS

- Docker
- Docker Compose

Aucune autre installation n’est nécessaire.


------------------------------------------------------------

LANCER L’APPLICATION

**À la racine du projet** :
```bash
docker compose build
docker compose up
```
Le premier lancement peut prendre quelques minutes.


------------------------------------------------------------

ACCÈS À L’APPLICATION

Frontend :
http://localhost:3000

Backend :
http://localhost:8000


------------------------------------------------------------

ARRÊTER L’APPLICATION

docker compose down


------------------------------------------------------------

APRÈS MODIFICATION DU CODE (IMPORTANT)

Docker fonctionne en mode production.
Les changements dans le code ne sont PAS pris en compte automatiquement.


Après modification du frontend :
```bash

docker compose build frontend --no-cache
docker compose up
```

Après modification du backend :
```bash
docker compose build backend --no-cache
docker compose up
```

------------------------------------------------------------

CONSEILS DE TEST

- Utiliser plusieurs navigateurs différents pour tester le mode multi-utilisateur
- Tester un admin et plusieurs joueurs en parallèle
- Éviter plusieurs onglets dans le même navigateur
- Ne pas recharger la page sans raison pendant un vote


------------------------------------------------------------

IMPORTATION DU PRODUCT BACKLOG (IMPORTANT)

Avant de pouvoir commencer une session de vote, il est nécessaire d'importer un fichier JSON contenant le product backlog.

**Fichier de test fourni :**
Le dossier principal du projet contient un fichier nommé `product-backlog.json` que vous pouvez utiliser .

------------------------------------------------------------

ÉTAT DU PROJET

- Application fonctionnelle
- WebSockets opérationnels
- Déploiement Docker validé
- Projet prêt pour démonstration et évaluation


------------------------------------------------------------

Réalisé par : 
Amadou Macka et Cyrine Nighaoui
