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
          <button onclick="renameDocumentPrompt('${doc.id}', 'identity')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Renommer le document">
            <i class="fas fa-pen text-yellow-600 text-sm"></i>
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

// Chargement des documents de santé
function loadHealthDocuments() {
  idbGetAllDocuments('health').then(stored => {
    const container = document.getElementById('documentsListHealth');
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document de santé</p>
        </div>
      `;
      return;
    }
    container.innerHTML = stored.map(doc => `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-red-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${doc.name}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'health')" class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-red-600 text-sm"></i>
          </button>
          <button onclick="shareDocument('${doc.id}', 'health')" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" title="Partager le document">
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
    `).join('');
  });
}

function loadHousingDocuments() {
  idbGetAllDocuments('housing').then(stored => {
    const container = document.getElementById('documentsListHousing');
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document de logement</p>
        </div>
      `;
      return;
    }
    container.innerHTML = stored.map(doc => `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-green-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${doc.name}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'housing')" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-green-600 text-sm"></i>
          </button>
          <button onclick="shareDocument('${doc.id}', 'housing')" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" title="Partager le document">
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
    `).join('');
  });
}

// ...existing code...

function loadCafDocuments() {
  idbGetAllDocuments('caf').then(stored => {
    const container = document.getElementById('documentsListCaf');
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document de la CAF</p>
        </div>
      `;
      return;
    }
    container.innerHTML = stored.map(doc => `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-purple-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${doc.name}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'caf')" class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-purple-600 text-sm"></i>
          </button>
          <button onclick="shareDocument('${doc.id}', 'caf')" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" title="Partager le document">
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
    `).join('');
  });
}

function loadResourcesDocuments() {
  idbGetAllDocuments('resources').then(stored => {
    const container = document.getElementById('documentsListResources');
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document de ressources</p>
        </div>
      `;
      return;
    }
    container.innerHTML = stored.map(doc => `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-orange-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${doc.name}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'resources')" class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-orange-600 text-sm"></i>
          </button>
          <button onclick="shareDocument('${doc.id}', 'resources')" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" title="Partager le document">
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
    `).join('');
  });
}

function loadBankDocuments() {
  idbGetAllDocuments('bank').then(stored => {
    const container = document.getElementById('documentsListBank');
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document bancaire</p>
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
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'bank')" class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-blue-600 text-sm"></i>
          </button>
          <button onclick="shareDocument('${doc.id}', 'bank')" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" title="Partager le document">
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
    `).join('');
  });
}

function loadTaxesDocuments() {
  idbGetAllDocuments('taxes').then(stored => {
    const container = document.getElementById('documentsListTaxes');
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document fiscal</p>
        </div>
      `;
      return;
    }
    container.innerHTML = stored.map(doc => `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-yellow-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${doc.name}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'taxes')" class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-yellow-600 text-sm"></i>
          </button>
          <button onclick="shareDocument('${doc.id}', 'taxes')" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" title="Partager le document">
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
    `).join('');
  });
}

function loadMobilityDocuments() {
  idbGetAllDocuments('mobility').then(stored => {
    const container = document.getElementById('documentsListMobility');
    if (!stored || stored.length === 0) {
      container.innerHTML = `
        <div class="bg-white rounded-xl p-6 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-folder-open text-gray-400 text-xl"></i>
          </div>
          <p class="text-gray-500">Aucun document de mobilité</p>
        </div>
      `;
      return;
    }
    container.innerHTML = stored.map(doc => `
      <div class="bg-white rounded-xl p-4 flex items-center relative" id="doc-row-${doc.id}">
        <div class="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mr-4">
          <i class="fas ${getFileIcon(doc.type)} text-pink-600"></i>
        </div>
        <div class="flex-1">
          <h3 class="font-medium text-gray-800 truncate">${doc.name}</h3>
          <p class="text-sm text-gray-500">${formatFileSize(doc.size)} • ${formatDate(doc.dateAdded)}</p>
        </div>
        <div class="flex space-x-2">
          <button id="eye-btn-${doc.id}" onclick="viewDocument('${doc.id}', 'mobility')" class="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center" title="Voir le document">
            <i id="eye-icon-${doc.id}" class="fas fa-eye text-pink-600 text-sm"></i>
          </button>
          <button onclick="shareDocument('${doc.id}', 'mobility')" class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center" title="Partager le document">
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
    `).join('');
  });
}

// ...existing code...

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
    showNotification("Document supprimé", "success");
  }).catch(() => {
    showNotification("Erreur lors de la suppression du document", "error");
  });
}

// Partager un document
function shareDocument(docId, category) {
  idbGetAllDocuments(category).then(stored => {
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
          text: 'Voici mes documents',
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