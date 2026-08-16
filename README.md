# 📱 CéCler Wallet

> Une portefeuille numérique sécurisée pour organiser et partager vos documents importants.

CéCler Wallet est une application Progressive Web App (PWA) légère qui aide les utilisateurs à stocker, organiser et partager leurs documents personnels directement depuis leur navigateur ou leur écran d'accueil mobile.

L'application est multilingue avec support pour le français, anglais, russe, arabe, tigrinya, dari et pachto.

## ✨ Caractéristiques Principales

- 📱 **Progressive Web App** - Installez comme une app native sur votre téléphone
- 📴 **Mode hors ligne complet** - Accédez à vos documents sans internet
- 🗂️ **8 catégories** - Identité, santé, logement, CAF, ressources, banque, mobilité, impôts
- 🔒 **Données privées** - Tous vos documents restent sur votre téléphone (IndexedDB local)
- 📸 **Aperçu** - Visualisez vos images et PDF directement
- 🔄 **Renommage & suppression** - Organisez vos documents facilement
- 📤 **Partage sécurisé** - Partagez tous vos documents ou une sélection
- 🌍 **7 langues** - Interface multilingue complète
- ⚡ **Ultra-rapide** - Chargement < 1s, fonctionne sur tous les appareils

## 🚀 Installation Rapide

### 📱 Sur Téléphone/Tablette

#### iPhone & iPad (3 clics)
1. Ouvrez **Safari** → Allez à `c-wallet.vercel.app`
2. Appuyez sur **Partager** ↑
3. Sélectionnez **"Sur l'écran d'accueil"** → **"Ajouter"**

#### Android (4 clics)
1. Ouvrez **Chrome** → Allez à `c-wallet.vercel.app`
2. Appuyez sur **⋮** (menu) → **"Installer l'app"**
3. Confirmez avec **"Installer"**

**👉 [Guide complet avec visuels et FAQ →](./README-INSTALLATION.md)**

## 📋 Catégories de Documents

| Catégorie | Exemples |
|-----------|----------|
| 🆔 Identité | Carte d'identité, passeport, permis |
| ❤️ Santé | Cartes vitale, ordonnances, vaccins |
| 🏠 Logement | Bail, factures, assurance habitation |
| 👥 CAF | Allocations, demandes, justificatifs |
| 💰 Ressources | Salaires, allocations, justificatifs |
| 🏦 Banque | RIB, relevés, contrats |
| 🚗 Mobilité | Permis, assurance auto, révisions |
| 📊 Impôts | Déclarations, avis d'imposition |

## 🛠️ Stack Technique

**Frontend**
- HTML5, CSS3, vanilla JavaScript
- Tailwind CSS 2.2 (CDN)
- Font Awesome 6 (CDN)
- Material Icons (CDN)

**Storage & PWA**
- IndexedDB pour stockage local
- Service Worker pour cache offline
- Web App Manifest pour installation

**Hosting**
- **Vercel** (CDN global recommandé)
- Netlify, GitHub Pages, Cloudflare Pages (alternative)

## 📁 Architecture des Fichiers

```
c-wallet/
├── index.html                # App principale (HTML + CSS + JS)
├── app.js                    # Logique (IndexedDB, partage, PWA)
├── service-worker.js         # Cache offline
├── manifest.json             # Configuration PWA
├── vercel.json              # Configuration de déploiement
├── icons/                   # Logos et favicon
├── README.md                # Ce fichier
├── README-INSTALLATION.md   # Guide d'installation pour utilisateurs
├── VERCEL-DEPLOYMENT.md     # Guide de déploiement technique
└── RESPONSIVE-FIXES.md      # Détails des optimisations mobile
```

## 🚀 Déploiement

### Sur Vercel (⭐ Recommandé)

**Option 1 : GitHub + Vercel**
```bash
git add .
git commit -m "feat: add Vercel config"
git push origin main
```
Puis : [vercel.com/new](https://vercel.com/new) → Sélectionnez votre repo → Deploy

**Option 2 : Vercel CLI**
```bash
npm i -g vercel
vercel --prod
```

**Option 3 : Drag & Drop**
- Allez à [vercel.com/new](https://vercel.com/new)
- Glissez-déposez votre dossier
- Deploy !

**Points clés** ✅
- `vercel.json` inclus avec configuration SPA
- Caching optimisé (icons: 1 an, service-worker: no-cache)
- Headers de sécurité configurés
- Pas de build step nécessaire

👉 **[Guide Vercel complet →](./VERCEL-DEPLOYMENT.md)**

### Autres Hébergeurs

Netlify, GitHub Pages, Cloudflare Pages supportent tous l'app. Consultez le README original pour les étapes spécifiques.

## 📱 Compatibilité

| Appareil | Support | Notes |
|----------|---------|-------|
| iPhone | ✅ iOS 12+ | Installation native |
| iPad | ✅ iPadOS 12+ | Installation native |
| Android | ✅ Version récente | Chrome/Firefox |
| Desktop | ✅ Tous navigateurs | Chrome, Safari, Firefox, Edge |

**Formats de fichiers** : PDF, JPG, JPEG, PNG (jusqu'à 10 MB chacun)

## 🧪 Test Local

```bash
# Démarrer un serveur local
python3 -m http.server 8000

# Ouvrir dans le navigateur
# http://localhost:8000
```

## 🔒 Sécurité & Confidentialité

✅ **Documents privés** - Stockage local (IndexedDB), pas de serveur externe  
✅ **Pas de suivi** - Aucune analyse ou publicité  
✅ **Fonctionne hors ligne** - Zéro dépendance internet  
✅ **Suppression facile** - Comme toute app (appui long + supprimer)  

⚠️ **Notes de sécurité**
- Documents non chiffrés (chiffrement local possible à l'avenir)
- Accès potentiel si le téléphone est compromis
- Essuyage du navigateur = suppression des docs
- Limites de stockage selon le navigateur et l'appareil

Pour un usage sensible en production, considérez l'ajout de chiffrement et d'authentification.

## 📊 Responsive Design

Entièrement optimisé pour tous les écrans :

| Taille | Breakpoint | Optimisation |
|--------|-----------|--------------|
| Petit phone | 320px | Logo responsive (w-20), texte fluide |
| iPhone | 375px | Texte optimisé (text-xs → sm:text-lg) |
| Phone+ | 414px | Layouts flexibles |
| Tablet | 768px+ | Spacing adapté |
| Desktop | 1024px+ | Max-width 448px (max-w-md) |

👉 **[Détails des fixes responsive →](./RESPONSIVE-FIXES.md)**

## 🌐 Langues

Changez la langue en appuyant sur l'icône 🌐 en haut :

- 🇫🇷 Français (défaut)
- 🇬🇧 English
- 🇷🇺 Русский
- 🇸🇦 العربية
- 🇪🇷 ትግርኛ
- 🇦🇫 دری
- 🇦🇫 پښتو

## 🧪 Checklist de Test

- [ ] Page d'accueil charge correctement
- [ ] Navigation entre catégories fonctionne
- [ ] Ajout de documents (PDF + image)
- [ ] Aperçu des documents
- [ ] Renommage de document
- [ ] Suppression de document
- [ ] Changement de langue
- [ ] Partage de documents
- [ ] Service Worker enregistré (DevTools → Application)
- [ ] App installée sur écran d'accueil
- [ ] Fonctionne hors ligne

## 📚 Documentation Complète

| Document | Contenu |
|----------|---------|
| `README-INSTALLATION.md` | Guide d'installation pour utilisateurs finaux |
| `VERCEL-DEPLOYMENT.md` | Déploiement technique complet |
| `RESPONSIVE-FIXES.md` | Détails des optimisations responsive |

## 🔧 Maintenance

Quand vous modifiez l'app, mettez à jour le cache dans `service-worker.js` :

```javascript
const CACHE_NAME = 'c-wallet-v1.0.4'; // Incrémentez le numéro
```

Cela force les utilisateurs à recevoir la nouvelle version au lieu d'une copie en cache.

## 📞 Support

- 🌐 Site officiel : [cecler.fr/ccwallet](https://www.cecler.fr/ccwallet)
- 📧 Email : support@cecler.fr
- 💬 Questions ? Contactez-nous

## 📄 Licence

Open source - Utilisez librement pour vos besoins.

## 🙏 Crédits

Créé avec ❤️ pour simplifier la gestion des documents importants.

---

**Version** : 1.0  
**Dernière mise à jour** : Août 2026  
**Statut** : ✅ Production Ready (Vercel + Responsive Design Optimisé)
