// Tronque un nom de fichier à 20 caractères max
function truncateFileName(name, maxLength = 20) {
  if (typeof name !== 'string') return '';
  return name.length > maxLength ? name.slice(0, maxLength) : name;
}
/*
*/

// Vérifie si on est dans la PWA installée
function isStandalonePWA() {
  return (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
}

// --- IndexedDB utils multi-catégories ---
const DB_NAME = 'cwallet-db';
const DB_VERSION = 3;
const DOC_STORES = {
  identity: 'identityDocs',
  health: 'healthDocs',
  housing: 'housingDocs',
  caf: 'cafDocs',
  resources: 'resourcesDocs',
  bank: 'bankDocs',
  taxes: 'taxesDocs',
  mobility: 'mobilityDocs'
};

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(e) {
      const db = e.target.result;
      for (const storeName of Object.values(DOC_STORES)) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
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

function idbSaveDocument(category, document) {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DOC_STORES[category]], 'readwrite');
      const store = tx.objectStore(DOC_STORES[category]);
      const req = store.add(document);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e);
    });
  });
}

function idbGetAllDocuments(category) {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DOC_STORES[category]], 'readonly');
      const store = tx.objectStore(DOC_STORES[category]);
      const req = store.getAll();
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e);
    });
  });
}

function idbDeleteDocument(category, docId) {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DOC_STORES[category]], 'readwrite');
      const store = tx.objectStore(DOC_STORES[category]);
      const req = store.delete(docId);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e);
    });
  });
}

function idbRenameDocument(category, docId, newName) {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([DOC_STORES[category]], 'readwrite');
      const store = tx.objectStore(DOC_STORES[category]);
      const getReq = store.get(docId);
      getReq.onsuccess = function(e) {
        const doc = e.target.result;
        if (!doc) return reject();
        doc.name = newName;
        const putReq = store.put(doc);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject();
      };
      getReq.onerror = () => reject();
    });
  });
}

// Gestion des fichiers pour identité et santé
function handleFileSelect(event, category) {
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
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64 = e.target.result;
      const uniqueId = `${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9]/g, '')}_${Math.floor(Math.random()*1e6)}`;
      idbSaveDocument(category, {
        id: uniqueId,
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
        dateAdded: new Date().toISOString()
      }).then(() => {
        addedCount++;
        processed++;
        if (processed === files.length) {
          event.target.value = '';
          if (category === 'identity') loadIdentityDocuments();
          if (category === 'identity') loadIdentityDocuments();
          else if (category === 'health') loadHealthDocuments();
          else if (category === 'housing') loadHousingDocuments();
          else if (category === 'caf') loadCafDocuments();
          else if (category === 'resources') loadResourcesDocuments();
          else if (category === 'bank') loadBankDocuments();
          else if (category === 'taxes') loadTaxesDocuments();
          else if (category === 'mobility') loadMobilityDocuments();
          if (addedCount > 0) showNotification(addedCount + " document(s) ajouté(s) avec succès!", "success");
          if (errorCount > 0) showNotification(errorCount + " fichier(s) ignoré(s) (type ou taille)", "error");
        }
      });
    };
    reader.onerror = function() {
      errorCount++;
      processed++;
      if (processed === files.length) {
        event.target.value = '';
        if (category === 'identity') loadIdentityDocuments();
        else if (category === 'health') loadHealthDocuments();
        else if (category === 'housing') loadHousingDocuments();
        else if (category === 'caf') loadCafDocuments();
        else if (category === 'resources') loadResourcesDocuments();
        else if (category === 'bank') loadBankDocuments();
        else if (category === 'taxes') loadTaxesDocuments();
        else if (category === 'mobility') loadMobilityDocuments();
        if (addedCount > 0) showNotification(addedCount + " document(s) ajouté(s) avec succès!", "success");
        if (errorCount > 0) showNotification(errorCount + " fichier(s) ignoré(s) (erreur)", "error");
      }
    };
    reader.readAsDataURL(file);
  }
}

// Chargement des documents d'identité
function loadIdentityDocuments() {
  idbGetAllDocuments('identity').then(stored => {
    const container = document.getElementById('documentsList');
    const shareAllBtn = document.querySelector("button[onclick=\"shareAllDocuments('identity')\"]");
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document d'identité</p>
        </div>
      `;
      if (shareAllBtn) {
        shareAllBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareAllBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareAllBtn.disabled = true;
      }
      return;
    }
    if (shareAllBtn) {
      shareAllBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareAllBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareAllBtn.disabled = false;
    }
    container.innerHTML = stored.map(doc => {
      const isSelected = window.selectedDocs && window.selectedDocs.has(doc.id);
      return `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-blue-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${truncateFileName(doc.name)}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'identity')" class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-blue-600 text-sm"></i>
          </button>
          <button type="button" onclick="toggleSelectIdentityDoc('${doc.id}', this)" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center${isSelected ? ' ring-2 ring-blue-500' : ''}" title="Sélectionner pour partage">
            <i class="fas fa-share-alt text-green-600 text-sm"></i>
          </button>
          <button onclick="renameDocumentPrompt('${doc.id}', 'identity')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Renommer le document">
            <i class="fas fa-pen text-yellow-600 text-sm"></i>
          </button>
          <button onclick="deleteDocument('${doc.id}', 'identity')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Supprimer le document">
            <i class="fas fa-trash text-red-600 text-sm"></i>
          </button>
        </div>
      </div>
      <div id="preview-${doc.id}" class="w-full flex justify-center mt-2"></div>
      `;
    }).join('');

    // Activer/désactiver le bouton "Partager sélectionnés"
    const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('identity')\"]");
    if (shareSelectedBtn) {
      if (window.selectedDocs && window.selectedDocs.size > 0) {
        shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = false;
      } else {
        shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = true;
      }
    }
  });
}


  

// Chargement des documents de santé
function loadHealthDocuments() {
  idbGetAllDocuments('health').then(stored => {
    const container = document.getElementById('documentsListHealth');
    const shareAllBtn = document.querySelector("button[onclick=\"shareAllDocuments('health')\"]");
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document de santé</p>
        </div>
      `;
      if (shareAllBtn) {
        shareAllBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareAllBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareAllBtn.disabled = true;
      }
      return;
    }
    if (shareAllBtn) {
      shareAllBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareAllBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareAllBtn.disabled = false;
    }
    container.innerHTML = stored.map(doc => {
      const isSelected = window.selectedDocs && window.selectedDocs.has(doc.id);
      return `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-red-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${truncateFileName(doc.name)}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'health')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-red-600 text-sm"></i>
          </button>
          <button type="button" onclick="toggleSelectHealthDoc('${doc.id}', this)" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center${isSelected ? ' ring-2 ring-blue-500' : ''}" title="Sélectionner pour partage">
            <i class="fas fa-share-alt text-green-600 text-sm"></i>
          </button>
          <button onclick="renameDocumentPrompt('${doc.id}', 'health')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Renommer le document">
            <i class="fas fa-pen text-yellow-600 text-sm"></i>
          </button>
          <button onclick="deleteDocument('${doc.id}', 'health')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Supprimer le document">
            <i class="fas fa-trash text-red-600 text-sm"></i>
          </button>
        </div>
      </div>
      <div id="preview-${doc.id}" class="w-full flex justify-center mt-2"></div>
    `}).join('');
    const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('health')\"]");
    if (shareSelectedBtn) {
      if (window.selectedDocs && window.selectedDocs.size > 0) {
        shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = false;
      } else {
        shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = true;
      }
    }
  });
}

function loadHousingDocuments() {
  idbGetAllDocuments('housing').then(stored => {
    const container = document.getElementById('documentsListHousing');
    const shareAllBtn = document.querySelector("button[onclick=\"shareAllDocuments('housing')\"]");
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document de logement</p>
        </div>
      `;
      if (shareAllBtn) {
        shareAllBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareAllBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareAllBtn.disabled = true;
      }
      return;
    }
    if (shareAllBtn) {
      shareAllBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareAllBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareAllBtn.disabled = false;
    }
    container.innerHTML = stored.map(doc => {
      const isSelected = window.selectedDocs && window.selectedDocs.has(doc.id);
      return `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-green-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${truncateFileName(doc.name)}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'housing')" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-green-600 text-sm"></i>
          </button>
          <button type="button" onclick="toggleSelectHousingDoc('${doc.id}', this)" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center${isSelected ? ' ring-2 ring-blue-500' : ''}" title="Sélectionner pour partage">
            <i class="fas fa-share-alt text-green-600 text-sm"></i>
          </button>
          <button onclick="renameDocumentPrompt('${doc.id}', 'housing')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Renommer le document">
            <i class="fas fa-pen text-yellow-600 text-sm"></i>
          </button>
          <button onclick="deleteDocument('${doc.id}', 'housing')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Supprimer le document">
            <i class="fas fa-trash text-red-600 text-sm"></i>
          </button>
        </div>
      </div>
      <div id="preview-${doc.id}" class="w-full flex justify-center mt-2"></div>
    `}).join('');
    const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('housing')\"]");
    if (shareSelectedBtn) {
      if (window.selectedDocs && window.selectedDocs.size > 0) {
        shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = false;
      } else {
        shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = true;
      }
    }
  });
}

// ...existing code...

function loadCafDocuments() {
  idbGetAllDocuments('caf').then(stored => {
    const container = document.getElementById('documentsListCaf');
    const shareAllBtn = document.querySelector("button[onclick=\"shareAllDocuments('caf')\"]");
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document de la CAF</p>
        </div>
      `;
      if (shareAllBtn) {
        shareAllBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareAllBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareAllBtn.disabled = true;
      }
      return;
    }
    if (shareAllBtn) {
      shareAllBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareAllBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareAllBtn.disabled = false;
    }
    container.innerHTML = stored.map(doc => {
      const isSelected = window.selectedDocs && window.selectedDocs.has(doc.id);
      return `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-purple-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${truncateFileName(doc.name)}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'caf')" class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-purple-600 text-sm"></i>
          </button>
          <button type="button" onclick="toggleSelectCafDoc('${doc.id}', this)" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center${isSelected ? ' ring-2 ring-blue-500' : ''}" title="Sélectionner pour partage">
            <i class="fas fa-share-alt text-green-600 text-sm"></i>
          </button>
          <button onclick="renameDocumentPrompt('${doc.id}', 'caf')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Renommer le document">
            <i class="fas fa-pen text-yellow-600 text-sm"></i>
          </button>
          <button onclick="deleteDocument('${doc.id}', 'caf')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Supprimer le document">
            <i class="fas fa-trash text-red-600 text-sm"></i>
          </button>
        </div>
      </div>
      <div id="preview-${doc.id}" class="w-full flex justify-center mt-2"></div>
    `}).join('');
    const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('caf')\"]");
    if (shareSelectedBtn) {
      if (window.selectedDocs && window.selectedDocs.size > 0) {
        shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = false;
      } else {
        shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = true;
      }
    }
  });
}

function loadResourcesDocuments() {
  idbGetAllDocuments('resources').then(stored => {
    const container = document.getElementById('documentsListResources');
    const shareAllBtn = document.querySelector("button[onclick=\"shareAllDocuments('resources')\"]");
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document de ressources</p>
        </div>
      `;
      if (shareAllBtn) {
        shareAllBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareAllBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareAllBtn.disabled = true;
      }
      return;
    }
    if (shareAllBtn) {
      shareAllBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareAllBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareAllBtn.disabled = false;
    }
    container.innerHTML = stored.map(doc => {
      const isSelected = window.selectedDocs && window.selectedDocs.has(doc.id);
      return `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-yellow-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${truncateFileName(doc.name)}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'resources')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-yellow-600 text-sm"></i>
          </button>
          <button type="button" onclick="toggleSelectResourcesDoc('${doc.id}', this)" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center${isSelected ? ' ring-2 ring-blue-500' : ''}" title="Sélectionner pour partage">
            <i class="fas fa-share-alt text-green-600 text-sm"></i>
          </button>
          <button onclick="renameDocumentPrompt('${doc.id}', 'resources')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Renommer le document">
            <i class="fas fa-pen text-yellow-600 text-sm"></i>
          </button>
          <button onclick="deleteDocument('${doc.id}', 'resources')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Supprimer le document">
            <i class="fas fa-trash text-red-600 text-sm"></i>
          </button>
        </div>
      </div>
      <div id="preview-${doc.id}" class="w-full flex justify-center mt-2"></div>
    `}).join('');
    const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('resources')\"]");
    if (shareSelectedBtn) {
      if (window.selectedDocs && window.selectedDocs.size > 0) {
        shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = false;
      } else {
        shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = true;
      }
    }
  });
}

function loadBankDocuments() {
  idbGetAllDocuments('bank').then(stored => {
    const container = document.getElementById('documentsListBank');
    const shareAllBtn = document.querySelector("button[onclick=\"shareAllDocuments('bank')\"]");
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document bancaire</p>
        </div>
      `;
      if (shareAllBtn) {
        shareAllBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareAllBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareAllBtn.disabled = true;
      }
      return;
    }
    if (shareAllBtn) {
      shareAllBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareAllBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareAllBtn.disabled = false;
    }
    container.innerHTML = stored.map(doc => {
      const isSelected = window.selectedDocs && window.selectedDocs.has(doc.id);
      return `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-blue-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${truncateFileName(doc.name)}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'bank')" class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-blue-600 text-sm"></i>
          </button>
          <button type="button" onclick="toggleSelectBankDoc('${doc.id}', this)" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center${isSelected ? ' ring-2 ring-blue-500' : ''}" title="Sélectionner pour partage">
            <i class="fas fa-share-alt text-green-600 text-sm"></i>
          </button>
          <button onclick="renameDocumentPrompt('${doc.id}', 'bank')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Renommer le document">
            <i class="fas fa-pen text-yellow-600 text-sm"></i>
          </button>
          <button onclick="deleteDocument('${doc.id}', 'bank')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Supprimer le document">
            <i class="fas fa-trash text-red-600 text-sm"></i>
          </button>
        </div>
      </div>
      <div id="preview-${doc.id}" class="w-full flex justify-center mt-2"></div>
    `}).join('');
    const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('bank')\"]");
    if (shareSelectedBtn) {
      if (window.selectedDocs && window.selectedDocs.size > 0) {
        shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = false;
      } else {
        shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = true;
      }
    }
  });
}

function loadTaxesDocuments() {
  idbGetAllDocuments('taxes').then(stored => {
    const container = document.getElementById('documentsListTaxes');
    const shareAllBtn = document.querySelector("button[onclick=\"shareAllDocuments('taxes')\"]");
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document fiscal</p>
        </div>
      `;
      if (shareAllBtn) {
        shareAllBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareAllBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareAllBtn.disabled = true;
      }
      return;
    }
    if (shareAllBtn) {
      shareAllBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareAllBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareAllBtn.disabled = false;
    }
    container.innerHTML = stored.map(doc => {
      const isSelected = window.selectedDocs && window.selectedDocs.has(doc.id);
      return `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-gray-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${truncateFileName(doc.name)}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'taxes')" class="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-gray-600 text-sm"></i>
          </button>
          <button type="button" onclick="toggleSelectTaxesDoc('${doc.id}', this)" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center${isSelected ? ' ring-2 ring-blue-500' : ''}" title="Sélectionner pour partage">
            <i class="fas fa-share-alt text-green-600 text-sm"></i>
          </button>
          <button onclick="renameDocumentPrompt('${doc.id}', 'taxes')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Renommer le document">
            <i class="fas fa-pen text-yellow-600 text-sm"></i>
          </button>
          <button onclick="deleteDocument('${doc.id}', 'taxes')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Supprimer le document">
            <i class="fas fa-trash text-red-600 text-sm"></i>
          </button>
        </div>
      </div>
      <div id="preview-${doc.id}" class="w-full flex justify-center mt-2"></div>
    `}).join('');
    const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('taxes')\"]");
    if (shareSelectedBtn) {
      if (window.selectedDocs && window.selectedDocs.size > 0) {
        shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = false;
      } else {
        shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = true;
      }
    }
  });
}

function loadMobilityDocuments() {
  idbGetAllDocuments('mobility').then(stored => {
    const container = document.getElementById('documentsListMobility');
    const shareAllBtn = document.querySelector("button[onclick=\"shareAllDocuments('mobility')\"]");
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document de mobilité</p>
        </div>
      `;
      if (shareAllBtn) {
        shareAllBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareAllBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareAllBtn.disabled = true;
      }
      return;
    }
    if (shareAllBtn) {
      shareAllBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareAllBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareAllBtn.disabled = false;
    }
    container.innerHTML = stored.map(doc => {
      const isSelected = window.selectedDocs && window.selectedDocs.has(doc.id);
      return `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-gray-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${truncateFileName(doc.name)}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'mobility')" class="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-gray-600 text-sm"></i>
          </button>
          <button type="button" onclick="toggleSelectMobilityDoc('${doc.id}', this)" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center${isSelected ? ' ring-2 ring-blue-500' : ''}" title="Sélectionner pour partage">
            <i class="fas fa-share-alt text-green-600 text-sm"></i>
          </button>
          <button onclick="renameDocumentPrompt('${doc.id}', 'mobility')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Renommer le document">
            <i class="fas fa-pen text-yellow-600 text-sm"></i>
          </button>
          <button onclick="deleteDocument('${doc.id}', 'mobility')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Supprimer le document">
            <i class="fas fa-trash text-red-600 text-sm"></i>
          </button>
        </div>
      </div>
      <div id="preview-${doc.id}" class="w-full flex justify-center mt-2"></div>
    `}).join('');
    const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('mobility')\"]");
    if (shareSelectedBtn) {
      if (window.selectedDocs && window.selectedDocs.size > 0) {
        shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = false;
      } else {
        shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
        shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
        shareSelectedBtn.disabled = true;
      }
    }
  });
}

// Sélection locale pour la page Mon identité (global)
window.selectedDocs = window.selectedDocs || new Set();

function toggleSelectIdentityDoc(docId, btn) {
  if (!window.selectedDocs) window.selectedDocs = new Set();
  if (window.selectedDocs.has(docId)) {
    window.selectedDocs.delete(docId);
    btn.classList.remove('ring-2','ring-blue-500');
  } else {
    window.selectedDocs.add(docId);
    btn.classList.add('ring-2','ring-blue-500');
  }
  // Mettre à jour l'état du bouton "Partager sélectionnés"
  const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('identity')\"]");
  if (shareSelectedBtn) {
    if (window.selectedDocs.size > 0) {
      shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = false;
    } else {
      shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = true;
    }
  }
}

function toggleSelectHealthDoc(docId, btn) {
  if (!window.selectedDocs) window.selectedDocs = new Set();
  if (window.selectedDocs.has(docId)) {
    window.selectedDocs.delete(docId);
    btn.classList.remove('ring-2','ring-blue-500');
  } else {
    window.selectedDocs.add(docId);
    btn.classList.add('ring-2','ring-blue-500');
  }
  // Mettre à jour l'état du bouton "Partager sélectionnés"
  const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('health')\"]");
  if (shareSelectedBtn) {
    if (window.selectedDocs.size > 0) {
      shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = false;
    } else {
      shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = true;
    }
  }
}

function toggleSelectHousingDoc(docId, btn) {
  if (!window.selectedDocs) window.selectedDocs = new Set();
  if (window.selectedDocs.has(docId)) {
    window.selectedDocs.delete(docId);
    btn.classList.remove('ring-2','ring-blue-500');
  } else {
    window.selectedDocs.add(docId);
    btn.classList.add('ring-2','ring-blue-500');
  }
  // Mettre à jour l'état du bouton "Partager sélectionnés"
  const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('housing')\"]");
  if (shareSelectedBtn) {
    if (window.selectedDocs.size > 0) {
      shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = false;
    } else {
      shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = true;
    }
  }
}

function toggleSelectCafDoc(docId, btn) {
  if (!window.selectedDocs) window.selectedDocs = new Set();
  if (window.selectedDocs.has(docId)) {
    window.selectedDocs.delete(docId);
    btn.classList.remove('ring-2','ring-blue-500');
  } else {
    window.selectedDocs.add(docId);
    btn.classList.add('ring-2','ring-blue-500');
  }
  // Mettre à jour l'état du bouton "Partager sélectionnés"
  const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('caf')\"]");
  if (shareSelectedBtn) {
    if (window.selectedDocs.size > 0) {
      shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = false;
    } else {
      shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = true;
    }
  }
}

function toggleSelectResourcesDoc(docId, btn) {
  if (!window.selectedDocs) window.selectedDocs = new Set();
  if (window.selectedDocs.has(docId)) {
    window.selectedDocs.delete(docId);
    btn.classList.remove('ring-2','ring-blue-500');
  } else {
    window.selectedDocs.add(docId);
    btn.classList.add('ring-2','ring-blue-500');
  }
  // Mettre à jour l'état du bouton "Partager sélectionnés"
  const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('resources')\"]");
  if (shareSelectedBtn) {
    if (window.selectedDocs.size > 0) {
      shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = false;
    } else {
      shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = true;
    }
  }
}

function toggleSelectBankDoc(docId, btn) {
  if (!window.selectedDocs) window.selectedDocs = new Set();
  if (window.selectedDocs.has(docId)) {
    window.selectedDocs.delete(docId);
    btn.classList.remove('ring-2','ring-blue-500');
  } else {
    window.selectedDocs.add(docId);
    btn.classList.add('ring-2','ring-blue-500');
  }
  // Mettre à jour l'état du bouton "Partager sélectionnés"
  const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('bank')\"]");
  if (shareSelectedBtn) {
    if (window.selectedDocs.size > 0) {
      shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = false;
    } else {
      shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = true;
    }
  }
}

function toggleSelectTaxesDoc(docId, btn) {
  if (!window.selectedDocs) window.selectedDocs = new Set();
  if (window.selectedDocs.has(docId)) {
    window.selectedDocs.delete(docId);
    btn.classList.remove('ring-2','ring-blue-500');
  } else {
    window.selectedDocs.add(docId);
    btn.classList.add('ring-2','ring-blue-500');
  }
  // Mettre à jour l'état du bouton "Partager sélectionnés"
  const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('taxes')\"]");
  if (shareSelectedBtn) {
    if (window.selectedDocs.size > 0) {
      shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = false;
    } else {
      shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = true;
    }
  }
}

function toggleSelectMobilityDoc(docId, btn) {
  if (!window.selectedDocs) window.selectedDocs = new Set();
  if (window.selectedDocs.has(docId)) {
    window.selectedDocs.delete(docId);
    btn.classList.remove('ring-2','ring-blue-500');
  } else {
    window.selectedDocs.add(docId);
    btn.classList.add('ring-2','ring-blue-500');
  }
  // Mettre à jour l'état du bouton "Partager sélectionnés"
  const shareSelectedBtn = document.querySelector("button[onclick=\"shareSelectedDocuments('mobility')\"]");
  if (shareSelectedBtn) {
    if (window.selectedDocs.size > 0) {
      shareSelectedBtn.classList.remove('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.add('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = false;
    } else {
      shareSelectedBtn.classList.add('bg-green-500','opacity-50','cursor-not-allowed');
      shareSelectedBtn.classList.remove('bg-green-600','hover:bg-green-700');
      shareSelectedBtn.disabled = true;
    }
  }
}

// Fonction pour partager les documents sélectionnés (identité)
function shareSelectedDocuments(category) {
  if (category === 'identity' && window.selectedDocs && window.selectedDocs.size > 0) {
    idbGetAllDocuments('identity').then(stored => {
      const docsToShare = stored.filter(doc => window.selectedDocs.has(doc.id));
      if (docsToShare.length > 0) {
        shareDocument(docsToShare, 'identity');
      }
    });
  }
  if (category === 'health' && window.selectedDocs && window.selectedDocs.size > 0) {
    idbGetAllDocuments('health').then(stored => {
      const docsToShare = stored.filter(doc => window.selectedDocs.has(doc.id));
      if (docsToShare.length > 0) {
        shareDocument(docsToShare, 'health');
      }
    });
  }
  if (category === 'housing' && window.selectedDocs && window.selectedDocs.size > 0) {
    idbGetAllDocuments('housing').then(stored => {
      const docsToShare = stored.filter(doc => window.selectedDocs.has(doc.id));
      if (docsToShare.length > 0) {
        shareDocument(docsToShare, 'housing');
      }
    });
  }
  if (category === 'caf' && window.selectedDocs && window.selectedDocs.size > 0) {
    idbGetAllDocuments('caf').then(stored => {
      const docsToShare = stored.filter(doc => window.selectedDocs.has(doc.id));
      if (docsToShare.length > 0) {
        shareDocument(docsToShare, 'caf');
      }
    });
  }
  if (category === 'resources' && window.selectedDocs && window.selectedDocs.size > 0) {
    idbGetAllDocuments('resources').then(stored => {
      const docsToShare = stored.filter(doc => window.selectedDocs.has(doc.id));
      if (docsToShare.length > 0) {
        shareDocument(docsToShare, 'resources');
      }
    });
  }
  if (category === 'bank' && window.selectedDocs && window.selectedDocs.size > 0) {
    idbGetAllDocuments('bank').then(stored => {
      const docsToShare = stored.filter(doc => window.selectedDocs.has(doc.id));
      if (docsToShare.length > 0) {
        shareDocument(docsToShare, 'bank');
      }
    });
  }
  if (category === 'taxes' && window.selectedDocs && window.selectedDocs.size > 0) {
    idbGetAllDocuments('taxes').then(stored => {
      const docsToShare = stored.filter(doc => window.selectedDocs.has(doc.id));
      if (docsToShare.length > 0) {
        shareDocument(docsToShare, 'taxes');
      }
    });
  }
  if (category === 'mobility' && window.selectedDocs && window.selectedDocs.size > 0) {
    idbGetAllDocuments('mobility').then(stored => {
      const docsToShare = stored.filter(doc => window.selectedDocs.has(doc.id));
      if (docsToShare.length > 0) {
        shareDocument(docsToShare, 'mobility');
      }
    });
  }
}

// Renommer un document
function renameDocumentPrompt(docId, category) {
  idbGetAllDocuments(category).then(stored => {
    const doc = stored.find(d => d.id === docId);
    if (!doc) return;
    const newName = prompt('Nouveau nom du document :', doc.name);
    if (newName && newName.trim() && newName !== doc.name) {
      idbRenameDocument(category, docId, newName.trim())
        .then(() => {
          if (category === 'identity') loadIdentityDocuments();
          if (category === 'health') loadHealthDocuments();
          if (category === 'mobility') loadMobilityDocuments();
          if (category === 'housing') loadHousingDocuments();
          if (category === 'caf') loadCafDocuments();
          if (category === 'resources') loadResourcesDocuments();
          if (category === 'bank') loadBankDocuments();
          if (category === 'taxes') loadTaxesDocuments();
          showNotification('Nom du document modifié', 'success');
        })
        .catch(() => showNotification('Erreur lors du renommage', 'error'));
    }
  });
}

// Voir un document
function viewDocument(docId, category) {
  idbGetAllDocuments(category).then(stored => {
    const doc = stored.find(d => d.id === docId);
    if (!doc) return;
    const previewDiv = document.getElementById('preview-' + docId);
    const eyeIcon = document.getElementById('eye-icon-' + docId);
    if (!previewDiv || !eyeIcon) return;
    if (previewDiv.innerHTML) {
      previewDiv.innerHTML = '';
      eyeIcon.classList.remove('fa-eye-slash');
      eyeIcon.classList.add('fa-eye');
      return;
    }
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
}

// Supprimer un document
function deleteDocument(docId, category) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;
  idbDeleteDocument(category, docId).then(() => {
    if (category === 'identity') loadIdentityDocuments();
    if (category === 'health') loadHealthDocuments();
    if (category === 'mobility') loadMobilityDocuments();
    if (category === 'housing') loadHousingDocuments();
    if (category === 'caf') loadCafDocuments();
    if (category === 'resources') loadResourcesDocuments();
    if (category === 'bank') loadBankDocuments();
    if (category === 'taxes') loadTaxesDocuments();
    showNotification("Document supprimé", "success");
  }).catch(() => {
    showNotification("Erreur lors de la suppression du document", "error");
  });
}

// Partager un document
// Peut prendre un docId (string) ou une liste de documents (array)
function shareDocument(docOrList, category) {
  // Si c'est une liste de documents (partage multiple)
  if (Array.isArray(docOrList)) {
    const files = docOrList.map(doc => {
      let fileExt = doc.type.startsWith('image/') ? '.jpg' : (doc.type === 'application/pdf' ? '.pdf' : '');
      return fetch(doc.data)
        .then(res => res.blob())
        .then(blob => new File([blob], doc.name || ('document' + fileExt), { type: doc.type }));
    });
    Promise.all(files).then(filesArr => {
      const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        navigator.share({
          title: 'Documents partagés',
          text: 'Voici mes documents',
          files: filesArr
        }).catch(() => {});
      } else {
        showNotification("Partage disponible uniquement sur mobile compatible.", "info");
      }
    });
    return;
  }
  idbGetAllDocuments(category).then(stored => {
    const doc = stored.find(d => d.id === docOrList);
    if (!doc) return;
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      let fileExt = doc.type.startsWith('image/') ? '.jpg' : (doc.type === 'application/pdf' ? '.pdf' : '');
      fetch(doc.data)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], doc.name || ('document' + fileExt), { type: doc.type });
          navigator.share({
            title: 'Document partagé',
            text: '',
            files: [file]
          }).catch(() => {});
        })
        .catch(() => {
          showNotification('Impossible de préparer le document pour le partage', 'error');
        });
      return;
    }
    showNotification("Partage disponible uniquement sur mobile compatible.", "info");
  });
}

function shareAllDocuments(category) {
  idbGetAllDocuments(category).then(stored => {
    const files = stored.map(doc => {
      let fileExt = doc.type.startsWith('image/') ? '.jpg' : (doc.type === 'application/pdf' ? '.pdf' : '');
      return fetch(doc.data)
        .then(res => res.blob())
        .then(blob => new File([blob], doc.name || ('document' + fileExt), { type: doc.type }));
    });
    Promise.all(files).then(files => {
      const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
      if (isMobile && navigator.share) {
        navigator.share({
          title: 'Documents partagés',
          text: '',
          files: files
        }).catch(() => {});
      } else {
        showNotification("Partage disponible uniquement sur mobile compatible.", "info");
      }
    });
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

// Navigation entre les pages
function openCategory(categoryId) {
  document.getElementById('homePage').classList.add('hidden');
  if (categoryId === 'identity') {
    document.getElementById('identityPage').classList.remove('hidden');
    loadIdentityDocuments();
  } else if (categoryId === 'health') {
    document.getElementById('healthPage').classList.remove('hidden');
    loadHealthDocuments();
  } else if (categoryId === 'housing') {
    document.getElementById('housingPage').classList.remove('hidden');
    loadHousingDocuments();
  } else if (categoryId === 'caf') {
    document.getElementById('cafPage').classList.remove('hidden');
    loadCafDocuments();
  } else if (categoryId === 'resources') {
    document.getElementById('resourcesPage').classList.remove('hidden');
    loadResourcesDocuments();
  } else if (categoryId === 'bank') {
    document.getElementById('bankPage').classList.remove('hidden');
    loadBankDocuments();
  } else if (categoryId === 'taxes') {
    document.getElementById('taxesPage').classList.remove('hidden');
    loadTaxesDocuments();
  } else if (categoryId === 'mobility') {
    document.getElementById('mobilityPage').classList.remove('hidden');
    loadMobilityDocuments();
  }
}

function goBack() {
  document.getElementById('identityPage').classList.add('hidden');
  document.getElementById('healthPage').classList.add('hidden');
  document.getElementById('housingPage').classList.add('hidden');
  document.getElementById('cafPage').classList.add('hidden');
  document.getElementById('resourcesPage').classList.add('hidden');
  document.getElementById('bankPage').classList.add('hidden');
  document.getElementById('taxesPage').classList.add('hidden');
  document.getElementById('mobilityPage').classList.add('hidden');
  document.getElementById('homePage').classList.remove('hidden');
  window.selectedDocs = new Set();
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

// Installation PWA
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});
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
  setTimeout(() => {
    if (installButton && installButton.parentNode) {
      installButton.remove();
    }
  }, 10000);
}
function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showNotification('C-wallet installé avec succès!', 'success');
      }
      deferredPrompt = null;
      const installButton = document.getElementById('installButton');
      if (installButton) installButton.remove();
    });
  }
}
window.addEventListener('appinstalled', () => {
  showNotification('C-wallet installé! Cherchez l\'icône sur votre écran d\'accueil.', 'success');
});