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
  showNotification('🎉 C-wallet installé! Cherchez l\'icône sur votre écran d\'accueil.', 'success');
});

// Fonctions QR Code
function showQRCode() {
    document.getElementById('qrModal').classList.remove('hidden');
    // Vider le contenu précédent
    document.getElementById('qrContent').innerHTML = '';
    document.getElementById('qrLoading').style.display = 'block';
    generateQR();
}

function closeQRCode() {
    document.getElementById('qrModal').classList.add('hidden');
}

async function generateQR() {
    try {
        // Obtenir l'IP locale
        let ip = '192.168.1.100'; // IP par défaut
        try {
            ip = await getLocalIP();
        } catch (e) {
            console.log('Utilisation IP par défaut');
        }
        
        const url = `http://${ip}:3000`;
        
        // Afficher l'URL
        document.getElementById('qrUrl').textContent = url;
        
        // Essayer plusieurs services QR
        const qrServices = [
            `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`,
            `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(url)}`,
            `https://qr-code-generator.p.rapidapi.com/qr?data=${encodeURIComponent(url)}&size=200x200`
        ];
        
        let qrLoaded = false;
        
        for (let i = 0; i < qrServices.length && !qrLoaded; i++) {
            const qrImage = document.createElement('img');
            qrImage.style.maxWidth = '100%';
            qrImage.style.height = 'auto';
            
            qrImage.onload = () => {
                if (!qrLoaded) {
                    qrLoaded = true;
                    document.getElementById('qrContent').innerHTML = '';
                    document.getElementById('qrContent').appendChild(qrImage);
                    document.getElementById('qrLoading').style.display = 'none';
                    console.log(`QR Code chargé avec service ${i + 1}`);
                }
            };
            
            qrImage.onerror = () => {
                console.log(`Service QR ${i + 1} échoué`);
                if (i === qrServices.length - 1 && !qrLoaded) {
                    // Tous les services ont échoué, afficher l'URL
                    document.getElementById('qrContent').innerHTML = `
                        <div class="text-center p-4 bg-gray-100 rounded">
                            <div class="text-red-600 mb-2">❌ QR Code indisponible</div>
                            <div class="text-sm text-gray-700">
                                <strong>Tapez cette URL sur votre téléphone :</strong><br>
                                <div class="bg-white p-2 mt-2 rounded border font-mono text-xs break-all">
                                    ${url}
                                </div>
                            </div>
                        </div>
                    `;
                    document.getElementById('qrLoading').style.display = 'none';
                }
            };
            
            qrImage.src = qrServices[i];
            
            // Attendre un peu avant d'essayer le suivant
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.error('Erreur QR:', error);
        document.getElementById('qrContent').innerHTML = '<div class="text-red-600">Erreur génération QR</div>';
        document.getElementById('qrLoading').style.display = 'none';
    }
}

function getLocalIP() {
    return new Promise((resolve, reject) => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        pc.onicecandidate = (ice) => {
            if (!ice || !ice.candidate) return;
            const candidate = ice.candidate.candidate;
            const ipMatch = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
            if (ipMatch && !ipMatch[0].startsWith('0.')) {
                pc.close();
                resolve(ipMatch[0]);
            }
        };
        
        setTimeout(() => {
            pc.close();
            reject('Timeout');
        }, 2000);
    });
}

// Ouvrir la page QR
function openQRPage() {
    window.open('qr_mobile.html', '_blank');
}

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
  const file = event.target.files[0];
  if (!file) return;
  
  // Vérifier la taille du fichier (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert("Le fichier est trop volumineux. Taille maximum: 10MB");
    return;
  }
  
  // Vérifier le type de fichier
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    alert("Type de fichier non supporté. Utilisez PDF, JPG ou PNG.");
    return;
  }
  
  // Lire le fichier
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    saveDocument('identity', {
      id: Date.now().toString(),
      name: file.name,
      type: file.type,
      size: file.size,
      data: base64,
      dateAdded: new Date().toISOString()
    });
    
    // Réinitialiser l'input
    event.target.value = '';
    
    // Recharger la liste des documents
    loadIdentityDocuments();
    
    // Afficher un message de succès
    showNotification("Document ajouté avec succès!", "success");
  };
  
  reader.onerror = function() {
    alert("Erreur lors de la lecture du fichier");
  };
  
  reader.readAsDataURL(file);
}

// Sauvegarde des documents par catégorie
function saveDocument(category, document) {
  const key = 'cw_docs_' + category;
  const stored = JSON.parse(localStorage.getItem(key) || '[]');
  stored.push(document);
  localStorage.setItem(key, JSON.stringify(stored));
}

// Chargement des documents d'identité
function loadIdentityDocuments() {
  const stored = JSON.parse(localStorage.getItem('cw_docs_identity') || '[]');
  const container = document.getElementById('documentsList');
  
  if (stored.length === 0) {
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
    <div class="bg-white rounded-xl p-4 flex items-center">
      <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
        <i class="fas ${getFileIcon(doc.type)} text-blue-600"></i>
      </div>
      <div class="flex-1">
        <h3 class="font-medium text-gray-800 truncate">${doc.name}</h3>
        <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
      </div>
      <div class="flex space-x-2">
        <button onclick="viewDocument('${doc.id}', 'identity')" class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <i class="fas fa-eye text-blue-600 text-sm"></i>
        </button>
        <button onclick="deleteDocument('${doc.id}', 'identity')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
          <i class="fas fa-trash text-red-600 text-sm"></i>
        </button>
      </div>
    </div>
  `).join('');
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
  const stored = JSON.parse(localStorage.getItem('cw_docs_' + category) || '[]');
  const doc = stored.find(d => d.id === docId);
  if (!doc) return;
  
  // Ouvrir le document dans un nouvel onglet
  const newWindow = window.open();
  newWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${doc.name}</title>
      <style>
        body { margin: 0; padding: 20px; font-family: system-ui; background: #f3f4f6; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background: white; padding: 20px; border-radius: 8px; text-align: center; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        iframe { width: 100%; height: 600px; border: none; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${doc.name}</h1>
          <p>Taille: ${formatFileSize(doc.size)} • Ajouté le: ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="content">
          ${doc.type.startsWith('image/') ? 
            `<img src="${doc.data}" alt="${doc.name}" />` :
            `<iframe src="${doc.data}"></iframe>`
          }
        </div>
      </div>
    </body>
    </html>
  `);
}

// Supprimer un document
function deleteDocument(docId, category) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
  
  const key = 'cw_docs_' + category;
  const stored = JSON.parse(localStorage.getItem(key) || '[]');
  const updated = stored.filter(doc => doc.id !== docId);
  localStorage.setItem(key, JSON.stringify(updated));
  
  // Recharger la liste
  if (category === 'identity') {
    loadIdentityDocuments();
  }
  
  showNotification("Document supprimé", "success");
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