
// Vérifie si on est dans la PWA installée
function isStandalonePWA() {
  return (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
}

// --- IndexedDB utils ---
const DB_NAME = 'cwallet-db';
const DB_VERSION = 1;
const DOC_STORE = 'identityDocs';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DOC_STORE)) {
        db.createObjectStore(DOC_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = function(e) {
      resolve(e.target.result);
    };
    request.onerror = function(e) {
      reject(e);
    };
  });
}

function idbSaveDocument(document) {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DOC_STORE], 'readwrite');
      const store = tx.objectStore(DOC_STORE);
      const req = store.add(document);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e);
    });
  });
}

function idbGetAllDocuments() {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DOC_STORE], 'readonly');
      const store = tx.objectStore(DOC_STORE);
      const req = store.getAll();
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e);
    });
  });
}

function idbDeleteDocument(docId) {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DOC_STORE], 'readwrite');
      const store = tx.objectStore(DOC_STORE);
      const req = store.delete(docId);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e);
    });
  });
}
// Installation PWA
let deferredPrompt;

// Écouter l'événement beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA: Installation disponible');
  // Empêcher le prompt automatique
  e.preventDefault();
  // Sauvegarder l'événement pour plus tard
  deferredPrompt = e;
  // Afficher un bouton d'installation personnalisé
  showInstallButton();
});

// Afficher le bouton d'installation
function showInstallButton() {
  const installButton = document.createElement('div');
  installButton.id = 'installButton';
  installButton.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer z-50 flex items-center space-x-2';
  installButton.innerHTML = `
    <i class="fas fa-download"></i>
    <span>Installer l'app</span>
  `;
  
  installButton.addEventListener('click', installApp);
  document.body.appendChild(installButton);
  
  // Masquer après 10 secondes
  setTimeout(() => {
    if (installButton && installButton.parentNode) {
      installButton.remove();
    }
  }, 10000);
}

// Installer l'app
function installApp() {
  if (deferredPrompt) {
    // Afficher le prompt d'installation
    deferredPrompt.prompt();
    
    // Attendre la réponse de l'utilisateur
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA: Installation acceptée');
        showNotification('C-wallet installé avec succès!', 'success');
      } else {
        console.log('PWA: Installation refusée');
      }
      // Nettoyer
      deferredPrompt = null;
      const installButton = document.getElementById('installButton');
      if (installButton) installButton.remove();
    });
  }
}

// Détecter si l'app est installée
window.addEventListener('appinstalled', (evt) => {
  console.log('PWA: App installée avec succès');
  showNotification('C-wallet installé! Cherchez l\'icône sur votre écran d\'accueil.', 'success');
});

// Navigation entre les pages
function openCategory(categoryId) {
  // Masquer la page d'accueil
  document.getElementById('homePage').classList.add('hidden');
  
  // Afficher la page de la catégorie
  if (categoryId === 'identity') {
    document.getElementById('identityPage').classList.remove('hidden');
    loadIdentityDocuments();
  }
  // Ajouter d'autres catégories ici plus tard
}

function goBack() {
  // Masquer toutes les pages de catégories
  document.getElementById('identityPage').classList.add('hidden');
  
  // Afficher la page d'accueil
  document.getElementById('homePage').classList.remove('hidden');
}

// Gestion des fichiers
function handleFileSelect(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  let addedCount = 0;
  let errorCount = 0;
  let processed = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size > 10 * 1024 * 1024) {
      errorCount++;
      continue;
    }
    if (!allowedTypes.includes(file.type)) {
      errorCount++;
      continue;
    }
    {
      // PDF ou autre type accepté
      const reader = new FileReader();
      reader.onload = function(e) {
        const base64 = e.target.result;
        const uniqueId = `${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9]/g, '')}_${Math.floor(Math.random()*1e6)}`;
        saveDocument('identity', {
          id: uniqueId,
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64,
          dateAdded: new Date().toISOString()
        });
        addedCount++;
        processed++;
        if (processed === files.length) {
          event.target.value = '';
          loadIdentityDocuments();
          if (addedCount > 0) showNotification(addedCount + " document(s) ajouté(s) avec succès!", "success");
          if (errorCount > 0) showNotification(errorCount + " fichier(s) ignoré(s) (type ou taille)", "error");
        }
      };
      reader.onerror = function() {
        errorCount++;
        processed++;
        if (processed === files.length) {
          event.target.value = '';
          loadIdentityDocuments();
          if (addedCount > 0) showNotification(addedCount + " document(s) ajouté(s) avec succès!", "success");
          if (errorCount > 0) showNotification(errorCount + " fichier(s) ignoré(s) (erreur)", "error");
        }
      };
      reader.readAsDataURL(file);
    }
  }
}

// Sauvegarde des documents par catégorie
function saveDocument(category, document) {
  if (category === 'identity') {
    idbSaveDocument(document)
      .then(() => {
        // Succès, rien à faire ici (notification déjà gérée dans handleFileSelect)
      })
      .catch((e) => {
        if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          showNotification("Espace de stockage plein : impossible d'ajouter plus de documents.", "error");
        } else {
          showNotification("Erreur lors de la sauvegarde du document.", "error");
        }
      });
  }
  // Pour d'autres catégories, garder localStorage (à adapter si besoin)
}

// Chargement des documents d'identité
function loadIdentityDocuments() {
  idbGetAllDocuments().then(stored => {
    const container = document.getElementById('documentsList');
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document d'identité</p>
        </div>
      `;
      return;
    }
    container.innerHTML = stored.map(doc => `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-blue-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${doc.name}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'identity')" class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-blue-600 text-sm"></i>
          </button>
          <button onclick="shareDocument('${doc.id}', 'identity')" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" title="Partager le document">
            <i class="fas fa-share-alt text-green-600 text-sm"></i>
          </button>
          <button onclick="deleteDocument('${doc.id}', 'identity')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Supprimer le document">
            <i class="fas fa-trash text-red-600 text-sm"></i>
          </button>
        </div>
      </div>
      <div id="preview-${doc.id}" class="w-full flex justify-center mt-2"></div>
    `).join('');
  });
}

// Utilitaires
function getFileIcon(type) {
  if (type === 'application/pdf') return 'fa-file-pdf';
  if (type.startsWith('image/')) return 'fa-file-image';
  return 'fa-file';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR');
}

// Voir un document
function viewDocument(docId, category) {
  if (category === 'identity') {
    idbGetAllDocuments().then(stored => {
      const doc = stored.find(d => d.id === docId);
      if (!doc) return;
      // Affichage/masquage de l'aperçu sous le document (toujours, même sur mobile)
      const previewDiv = document.getElementById('preview-' + docId);
      const eyeIcon = document.getElementById('eye-icon-' + docId);
      if (!previewDiv || !eyeIcon) return;
      // Toggle: si déjà affiché, on enlève et remet l'oeil normal
      if (previewDiv.innerHTML) {
        previewDiv.innerHTML = '';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
        return;
      }
      // Afficher l'image ou le PDF et mettre l'oeil barré
      if (doc.type.startsWith('image/')) {
        previewDiv.innerHTML = `<img src="${doc.data}" alt="Aperçu" class="max-h-64 rounded-lg shadow border" />`;
      } else if (doc.type === 'application/pdf') {
        previewDiv.innerHTML = `<iframe src="${doc.data}" class="w-full max-w-xl h-64 rounded-lg shadow border" frameborder="0"></iframe>`;
      } else {
        previewDiv.innerHTML = `<div class='text-gray-500'>Aperçu non disponible</div>`;
      }
      eyeIcon.classList.remove('fa-eye');
      eyeIcon.classList.add('fa-eye-slash');
    });
    return;
  }
  // Pour d'autres catégories, garder localStorage (à adapter si besoin)
}

// Supprimer un document
function deleteDocument(docId, category) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
  if (category === 'identity') {
    idbDeleteDocument(docId).then(() => {
      loadIdentityDocuments();
      showNotification("Document supprimé", "success");
    }).catch(() => {
      showNotification("Erreur lors de la suppression du document", "error");
    });
    return;
  }
  // Pour d'autres catégories, garder localStorage (à adapter si besoin)
}

// Notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Ancienne fonction pour compatibilité
function handleAddDocument() {
  document.getElementById("fileInput").click();
}

// Enregistre le service worker pour activer la PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

function shareDocument(docId, category) {
  if (category === 'identity') {
    idbGetAllDocuments().then(stored => {
      const doc = stored.find(d => d.id === docId);
      if (!doc) return;
      const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        let fileExt = doc.type.startsWith('image/') ? '.jpg' : (doc.type === 'application/pdf' ? '.pdf' : '');
        fetch(doc.data)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], doc.name || ('document' + fileExt), { type: doc.type });
            navigator.share({
              title: doc.name,
              text: 'Voici mon document',
              files: [file]
            }).catch(() => {
              showNotification('Partage annulé ou non supporté', 'error');
            });
          })
          .catch(() => {
            showNotification('Impossible de préparer le document pour le partage', 'error');
          });
        return;
      }
      showNotification("Partage disponible uniquement sur mobile compatible.", "info");
    });
    return;
  }
  // Pour d'autres catégories, garder localStorage (à adapter si besoin)
}