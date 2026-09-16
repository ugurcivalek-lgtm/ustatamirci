/**
 * ustatamirci - Kombi & Klima Servis Takip Uygulaması
 * Servis, Müşteri ve Fiyat Teklifi (PDF/WhatsApp) Yönetimi.
 */

// Storage Keys - Updated to v3 to load clean data with proposals module
const STORAGE_KEY = 'kombi_klima_service_tracker_data_v3_teklifli';

// Global State
let state = {
  activeTab: 'services',
  filterStatus: 'all',
  proposalFilter: 'all',
  searchQuery: '',
  data: null,
  serviceModalMode: 'new', // 'new' or 'existing'
  editingServiceId: null,
  editingCustomerId: null,
  viewingCustomerId: null,
  printingServiceId: null,
  editingProposalId: null,
  printingProposalId: null,
  servicesPageLimit: 50,
  customersPageLimit: 40
};

// Turkish Brand suggestions
const POPULAR_BRANDS = {
  kombi: ['DemirDöküm', 'Vaillant', 'E.C.A.', 'Baymak', 'Bosch', 'Buderus', 'Viessmann', 'Protherm', 'Ferroli', 'Alarko', 'Ariston', 'Daikin', 'Airfel', 'Warmhaus'],
  klima: ['Daikin', 'Mitsubishi Electric', 'Mitsubishi Heavy', 'Arçelik', 'Beko', 'Vestel', 'Baymak', 'Samsung', 'LG', 'Bosch', 'Toshiba', 'Gree', 'Airfel', 'Fujitsu'],
  sofben: ['DemirDöküm', 'E.C.A.', 'Baymak', 'Bosch', 'Vaillant'],
  termosifon: ['DemirDöküm', 'Arçelik', 'Beko', 'Baymak', 'Vestel', 'Termodinamik']
};

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCfNsPjwBybMEpv6BTTdw6NA0DDOlsZgdE",
  authDomain: "ustatamirci-dd7b2.firebaseapp.com",
  projectId: "ustatamirci-dd7b2",
  storageBucket: "ustatamirci-dd7b2.firebasestorage.app",
  messagingSenderId: "839417863963",
  appId: "1:839417863963:web:e35e5ce20b0e2b3c213dbe",
  databaseURL: "https://ustatamirci-dd7b2-default-rtdb.firebaseio.com"
};

// Initialize Firebase
let database = null;
try {
  firebase.initializeApp(firebaseConfig);
  database = firebase.database();
} catch (e) {
  console.error("Firebase başlatılamadı:", e);
}

let isInitialLoad = true;
let isSavingToCloud = false;

// Initialization
function initApp() {
  loadData();
  setupEventListeners();
  initDistrictsDropdowns();
  
  // Varsayılan olarak bugünün kayıtlarını göstermek için tarih filtresini bugüne ayarla
  const dateFilter = document.getElementById('serviceDateFilter');
  if (dateFilter && !dateFilter.value) {
    dateFilter.value = new Date().toISOString().split('T')[0];
  }
  
  renderAll();
  lucide.createIcons();
}

// Load data from LocalStorage and sync with Firebase Realtime Database
function loadData() {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      state.data = JSON.parse(local);
      if (!state.data.settings) state.data.settings = {};
      if (!state.data.settings.businessName || state.data.settings.businessName.includes("GÜVEN")) {
        state.data.settings.businessName = "ustatamirci";
      }
      if (!state.data.proposals) {
        state.data.proposals = (INITIAL_DATA && INITIAL_DATA.proposals) ? INITIAL_DATA.proposals : [];
      }
    } else {
      state.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    }
  } catch (e) {
    console.error("Veri yüklenirken hata oluştu:", e);
    state.data = JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  // Realtime Cloud Sync
  if (database) {
    database.ref('ustatamirci_data').on('value', (snapshot) => {
      if (isSavingToCloud) return; // Ignore events triggered by our own saves to avoid loop
      
      const cloudData = snapshot.val();
      if (cloudData) {
        state.data = cloudData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
        if (!isInitialLoad) {
          renderAll();
        }
      } else {
        // Cloud is empty, push local data
        database.ref('ustatamirci_data').set(state.data);
      }
      isInitialLoad = false;
    });
  }
}

// Save state to LocalStorage and Cloud
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    isSavingToCloud = true;
    if (database) {
      database.ref('ustatamirci_data').set(state.data).then(() => {
        setTimeout(() => isSavingToCloud = false, 500);
      }).catch(err => {
        console.error("Buluta kaydedilemedi", err);
        isSavingToCloud = false;
      });
    } else {
      isSavingToCloud = false;
    }
  } catch (e) {
    alert("Hata: Tarayıcı hafızasına kayıt yapılamadı!");
    console.error(e);
  }
}

// Format currency
function formatMoney(amount) {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

// Helpers
function getCustomer(id) {
  return state.data.customers.find(c => c.id === id) || null;
}

function getDevice(id) {
  return state.data.devices.find(d => d.id === id) || null;
}

function getCustomerDevices(customerId) {
  return state.data.devices.filter(d => d.customerId === customerId);
}

function getCustomerServices(customerId) {
  return state.data.services.filter(s => s.customerId === customerId).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// -------------------------------------------------------------
// İLÇE & MAHALLE OTOMATİK DOLDURMA
// -------------------------------------------------------------
function initDistrictsDropdowns() {
  if (typeof ISTANBUL_DISTRICTS === 'undefined') return;

  const districts = Object.keys(ISTANBUL_DISTRICTS).sort((a, b) => a.localeCompare(b, 'tr'));
  const options = '<option value="">-- İlçe Seçiniz --</option>' + 
    districts.map(d => `<option value="${d}">${d}</option>`).join('');

  const newCustDistrict = document.getElementById('newCustDistrict');
  if (newCustDistrict) newCustDistrict.innerHTML = options;

  const custDistrict = document.getElementById('custDistrict');
  if (custDistrict) custDistrict.innerHTML = options;
}

function onDistrictChange(districtName, preselectedNeighborhood = '') {
  const neighborhoodSelect = document.getElementById('newCustNeighborhood');
  if (!neighborhoodSelect) return;

  if (!districtName || typeof ISTANBUL_DISTRICTS === 'undefined' || !ISTANBUL_DISTRICTS[districtName]) {
    neighborhoodSelect.innerHTML = '<option value="">-- Önce İlçe Seçin --</option>';
    return;
  }

  const neighborhoods = ISTANBUL_DISTRICTS[districtName].sort((a, b) => a.localeCompare(b, 'tr'));
  let optionsHtml = '<option value="">-- Mahalle Seçiniz --</option>';
  neighborhoods.forEach(n => {
    const isSel = (n.toLowerCase() === (preselectedNeighborhood || '').toLowerCase()) ? 'selected' : '';
    optionsHtml += `<option value="${n}" ${isSel}>${n}</option>`;
  });
  optionsHtml += '<option value="Diğer">Diğer (Listede Yok)</option>';

  neighborhoodSelect.innerHTML = optionsHtml;
}

function onCustomerModalDistrictChange(districtName, preselectedNeighborhood = '') {
  const neighborhoodSelect = document.getElementById('custNeighborhood');
  if (!neighborhoodSelect) return;

  if (!districtName || typeof ISTANBUL_DISTRICTS === 'undefined' || !ISTANBUL_DISTRICTS[districtName]) {
    neighborhoodSelect.innerHTML = '<option value="">-- Önce İlçe Seçin --</option>';
    return;
  }

  const neighborhoods = ISTANBUL_DISTRICTS[districtName].sort((a, b) => a.localeCompare(b, 'tr'));
  let optionsHtml = '<option value="">-- Mahalle Seçiniz --</option>';
  neighborhoods.forEach(n => {
    const isSel = (n.toLowerCase() === (preselectedNeighborhood || '').toLowerCase()) ? 'selected' : '';
    optionsHtml += `<option value="${n}" ${isSel}>${n}</option>`;
  });
  optionsHtml += '<option value="Diğer">Diğer (Listede Yok)</option>';

  neighborhoodSelect.innerHTML = optionsHtml;
}

// UI State Switcher
function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const activeSection = document.getElementById(`tab-${tabId}`);
  if (activeSection) activeSection.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active-nav', 'bg-sky-50', 'text-sky-700', 'border-sky-500');
    btn.classList.add('text-slate-600', 'border-transparent');
  });

  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active-nav', 'bg-sky-50', 'text-sky-700', 'border-sky-500');
    activeBtn.classList.remove('text-slate-600', 'border-transparent');
  }

  renderAll();
  lucide.createIcons();
}

// Render everything
function renderAll() {
  renderDashboardStats();
  renderServicesList();
  renderProposalsList();
  renderCustomersList();
  renderMaintenanceList();
  renderFinance();
  renderSettings();
  updateBadgeCounts();
}

// Dashboard statistics
function renderDashboardStats() {
  const today = new Date().toISOString().split('T')[0];
  const services = state.data.services;

  const todayCount = services.filter(s => s.date === today).length;
  const pendingCount = services.filter(s => s.status === 'pending' || s.status === 'waiting_part').length;
  const completedCount = services.filter(s => s.status === 'completed').length;

  let totalIncome = 0;
  let totalReceivable = 0;

  services.forEach(s => {
    totalIncome += Number(s.paidAmount || 0);
    totalReceivable += Number(s.remainingAmount || 0);
  });

  const elToday = document.getElementById('statToday');
  const elPending = document.getElementById('statPending');
  const elCompleted = document.getElementById('statCompleted');
  const elIncome = document.getElementById('statIncome');
  const elReceivable = document.getElementById('statReceivable');

  if (elToday) elToday.innerText = todayCount;
  if (elPending) elPending.innerText = pendingCount;
  if (elCompleted) elCompleted.innerText = completedCount;
  if (elIncome) elIncome.innerText = formatMoney(totalIncome);
  if (elReceivable) elReceivable.innerText = formatMoney(totalReceivable);
}

function updateBadgeCounts() {
  const pendingCount = state.data.services.filter(s => s.status === 'pending' || s.status === 'waiting_part').length;
  const maintenanceCount = calculateDueMaintenances().length;
  const proposalCount = (state.data.proposals || []).length;

  const badgePending = document.getElementById('badgePendingCount');
  if (badgePending) {
    if (pendingCount > 0) {
      badgePending.innerText = pendingCount;
      badgePending.classList.remove('hidden');
    } else {
      badgePending.classList.add('hidden');
    }
  }

  const badgeMaint = document.getElementById('badgeMaintenanceCount');
  if (badgeMaint) {
    if (maintenanceCount > 0) {
      badgeMaint.innerText = maintenanceCount;
      badgeMaint.classList.remove('hidden');
    } else {
      badgeMaint.classList.add('hidden');
    }
  }

  const badgeProp = document.getElementById('badgeProposalCount');
  if (badgeProp) {
    badgeProp.innerText = proposalCount;
    if (proposalCount > 0) {
      badgeProp.classList.remove('hidden');
    } else {
      badgeProp.classList.add('hidden');
    }
  }
}

function calculateDueMaintenances() {
  const now = new Date();
  const dueList = [];

  state.data.devices.forEach(device => {
    const cust = getCustomer(device.customerId);
    if (!cust) return;

    const devServices = state.data.services
      .filter(s => s.deviceId === device.id && s.status === 'completed')
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    let lastServiceDate = null;
    let lastService = null;

    if (devServices.length > 0) {
      lastService = devServices[0];
      lastServiceDate = new Date(devServices[0].date);
    } else {
      lastServiceDate = new Date(cust.createdAt || '2024-01-01');
    }

    if (lastServiceDate) {
      const diffTime = Math.abs(now - lastServiceDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 330) {
        dueList.push({
          customer: cust,
          device: device,
          lastService: lastService,
          daysAgo: diffDays,
          lastDateStr: lastService ? lastService.date : (cust.createdAt || '2024-01-01')
        });
      }
    }
  });

  return dueList;
}

// -------------------------------------------------------------
// TAB 1: SERVISLER LİSTESİ (Sayfalama ve Hızlı Arama Destekli)
// -------------------------------------------------------------
function renderServicesList() {
  const container = document.getElementById('servicesListContainer');
  if (!container) return;

  let list = [...state.data.services];

  const dateFilterInput = document.getElementById('serviceDateFilter');
  if (dateFilterInput && dateFilterInput.value) {
    list = list.filter(s => s.date === dateFilterInput.value);
  }

  if (state.filterStatus === 'pending') {
    list = list.filter(s => s.status === 'pending');
  } else if (state.filterStatus === 'in_progress') {
    list = list.filter(s => s.status === 'in_progress');
  } else if (state.filterStatus === 'waiting_part') {
    list = list.filter(s => s.status === 'waiting_part');
  } else if (state.filterStatus === 'completed') {
    list = list.filter(s => s.status === 'completed');
  } else if (state.filterStatus === 'debt') {
    list = list.filter(s => Number(s.remainingAmount || 0) > 0);
  }

  const query = state.searchQuery.toLowerCase().trim();
  const isSearching = query.length > 0;

  if (isSearching) {
    list = list.filter(s => {
      const c = getCustomer(s.customerId);
      const d = getDevice(s.deviceId);
      const cName = c ? c.name.toLowerCase() : '';
      const cPhone = c ? c.phone.replace(/\s+/g, '') : '';
      const cDistrict = c ? (c.district || '').toLowerCase() : '';
      const devBrand = d ? (d.brand || '').toLowerCase() : '';
      const slip = (s.slipNo || '').toLowerCase();
      const fault = (s.faultDescription || '').toLowerCase();
      const cleanQ = query.replace(/\s+/g, '');

      return cName.includes(query) || 
             cPhone.includes(cleanQ) || 
             cDistrict.includes(query) || 
             devBrand.includes(query) || 
             slip.includes(query) || 
             fault.includes(query);
    });
  }

  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalCount = list.length;
  // If not searching, slice to limit for fast rendering
  const displayList = isSearching ? list : list.slice(0, state.servicesPageLimit);

  if (displayList.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <div class="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <i data-lucide="inbox" class="w-8 h-8"></i>
        </div>
        <h3 class="text-base font-semibold text-slate-700">Kayıt Bulunamadı</h3>
        <p class="text-sm text-slate-500 mt-1 max-w-md mx-auto">Arama kriterlerinize veya seçilen duruma uygun servis kaydı yok.</p>
        <button onclick="openUnifiedServiceModal('new')" class="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium inline-flex items-center gap-2">
          <i data-lucide="user-plus" class="w-4 h-4"></i> Yeni Müşteri & Servis Aç
        </button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const statusMap = {
    pending: { label: 'Randevu Verildi', badgeClass: 'badge-pending', icon: 'calendar-clock' },
    in_progress: { label: 'İşlemde / Sahada', badgeClass: 'badge-in_progress', icon: 'wrench' },
    waiting_part: { label: 'Parça Bekliyor', badgeClass: 'badge-waiting_part', icon: 'package-search' },
    completed: { label: 'Tamamlandı', badgeClass: 'badge-completed', icon: 'check-circle-2' },
    cancelled: { label: 'İptal Edildi', badgeClass: 'badge-cancelled', icon: 'x-circle' }
  };

  let html = '';
  displayList.forEach(s => {
    const cust = getCustomer(s.customerId) || { name: 'Müşteri', phone: '-', address: '-', district: '-' };
    const dev = getDevice(s.deviceId) || { type: 'kombi', brand: 'Kombi', model: '' };
    const st = statusMap[s.status] || statusMap.pending;
    const isKombi = (dev.type || '').toLowerCase() === 'kombi';
    const isDebt = Number(s.remainingAmount || 0) > 0;

    html += `
      <div class="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-sky-300 hover:shadow-md transition-all">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isKombi ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-cyan-50 text-cyan-600 border border-cyan-200'}">
              <i data-lucide="${isKombi ? 'flame' : 'snowflake'}" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <button onclick="viewCustomerHistory('${s.customerId}')" class="font-extrabold text-slate-800 hover:text-sky-600 text-base hover:underline text-left cursor-pointer transition inline-flex items-center gap-1.5" title="Müşteri profilini ve tüm geçmişini gör">
                  <span>${cust.name}</span>
                  <span class="text-[10px] font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-1.5 py-0.5 rounded-md">Geçmiş</span>
                </button>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${st.badgeClass} flex items-center gap-1">
                  <i data-lucide="${st.icon}" class="w-3 h-3"></i> ${st.label}
                </span>
                <span class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono">${s.slipNo || 'NO-SLIP'}</span>
              </div>
              <div class="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span class="flex items-center gap-1 text-slate-700 font-medium">
                  <i data-lucide="phone" class="w-3.5 h-3.5 text-sky-600"></i>
                  <a href="tel:${cust.phone}" class="hover:underline">${cust.phone}</a>
                </span>
                <span class="text-slate-300">|</span>
                <span class="flex items-center gap-1 text-slate-700 font-semibold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                  <i data-lucide="calendar" class="w-3.5 h-3.5 text-orange-600"></i> ${formatDate(s.date)} ${s.appointmentTime ? ' - ' + s.appointmentTime : ''}
                </span>
              </div>
              <div class="mt-1.5 text-xs text-slate-500 flex items-start gap-1">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"></i>
                <span>
                  <strong class="text-slate-600">${cust.district || ''} ${cust.neighborhood ? ' • ' + cust.neighborhood : ''}</strong>
                  ${cust.address ? `<br><span class="text-[11px]">${cust.address}</span>` : ''}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 self-end lg:self-center">
            <div class="text-right">
              <div class="text-sm font-bold text-slate-800">${formatMoney(s.totalAmount)}</div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-3 text-xs">
          <div class="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <div class="text-slate-400 font-medium mb-1 flex items-center gap-1">
              <i data-lucide="cpu" class="w-3.5 h-3.5"></i> Cihaz Bilgisi:
            </div>
            <div class="font-semibold text-slate-700 text-sm">
              ${dev.brand} ${dev.model || ''}
            </div>
            <div class="text-slate-500 mt-0.5 uppercase text-[10px]">
              ${dev.type}
            </div>
          </div>

          <div class="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <div class="text-slate-400 font-medium mb-1 flex items-center gap-1">
              <i data-lucide="alert-circle" class="w-3.5 h-3.5 text-amber-500"></i> Şikayet / Arıza:
            </div>
            <div class="text-slate-700 font-medium line-clamp-2" title="${s.faultDescription}">
              ${s.faultDescription || 'Belirtilmedi'}
            </div>
            ${s.actionTaken ? `
              <div class="text-slate-500 mt-1 pt-1 border-t border-slate-200/50 line-clamp-1">
                <span class="text-emerald-600 font-semibold">İşlem:</span> ${s.actionTaken}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
          <div class="flex items-center gap-1.5">
            <label class="text-xs text-slate-400 font-medium">Hızlı Durum:</label>
            <select onchange="updateServiceStatus('${s.id}', this.value)" class="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-sky-500 font-medium">
              <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>Randevu Verildi</option>
              <option value="in_progress" ${s.status === 'in_progress' ? 'selected' : ''}>İşlemde</option>
              <option value="waiting_part" ${s.status === 'waiting_part' ? 'selected' : ''}>Parça Bekliyor</option>
              <option value="completed" ${s.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
              <option value="cancelled" ${s.status === 'cancelled' ? 'selected' : ''}>İptal</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="sendWhatsAppService('${s.id}')" title="WhatsApp ile Bilgi Gönder" class="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp
            </button>
            <button onclick="openPrintModal('${s.id}')" title="Resmi Servis Fişi Yazdır" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
              <i data-lucide="printer" class="w-3.5 h-3.5"></i> Fiş Yazdır
            </button>
            <button onclick="editService('${s.id}')" title="Servisi Düzenle" class="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Düzenle
            </button>
            <button onclick="deleteService('${s.id}')" title="Sil" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  // Load more button if there are more items
  if (!isSearching && totalCount > state.servicesPageLimit) {
    html += `
      <div class="text-center pt-4">
        <button onclick="state.servicesPageLimit += 50; renderServicesList();" class="px-6 py-2.5 bg-white hover:bg-sky-50 text-sky-700 border border-slate-300 rounded-xl font-bold text-xs shadow-xs transition">
          Daha Fazla Göster (Toplam ${totalCount} kayıttan ${displayList.length} gösteriliyor)
        </button>
      </div>
    `;
  }

  container.innerHTML = html;
  lucide.createIcons();
}

function setFilterStatus(status) {
  state.filterStatus = status;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.remove('bg-sky-600', 'text-white', 'shadow-sm');
    b.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
  });

  const activeBtn = document.getElementById(`filter-btn-${status}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
    activeBtn.classList.add('bg-sky-600', 'text-white', 'shadow-sm');
  }

  renderServicesList();
}
window.setFilterStatus = setFilterStatus;
window.setfilterstatus = setFilterStatus; // alias for lowercase usage

// -------------------------------------------------------------
// TAB 2: MÜŞTERİLER LİSTESİ (Sayfalama ve Hızlı Arama Destekli)
// -------------------------------------------------------------
function renderCustomersList() {
  const container = document.getElementById('customersListContainer');
  if (!container) return;

  let customers = [...state.data.customers];
  const query = (state.searchQuery || '').toLowerCase().trim();
  const isSearching = query.length > 0;

  if (isSearching) {
    customers = customers.filter(c => {
      const cleanPhone = (c.phone || '').replace(/\s+/g, '');
      const cleanQ = query.replace(/\s+/g, '');
      return (c.name || '').toLowerCase().includes(query) ||
             cleanPhone.includes(cleanQ) ||
             (c.district || '').toLowerCase().includes(query) ||
             (c.neighborhood || '').toLowerCase().includes(query) ||
             (c.address || '').toLowerCase().includes(query);
    });
  }

  customers.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  const totalCount = customers.length;
  const displayList = isSearching ? customers : customers.slice(0, state.customersPageLimit);

  if (displayList.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-12 text-center border border-slate-200 col-span-full">
        <div class="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <i data-lucide="users" class="w-8 h-8"></i>
        </div>
        <h3 class="text-base font-semibold text-slate-700">Müşteri Bulunamadı</h3>
        <p class="text-sm text-slate-500 mt-1 max-w-md mx-auto">Arama kriterlerinize uygun müşteri yok.</p>
        <button onclick="openUnifiedServiceModal('new')" class="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium inline-flex items-center gap-2">
          <i data-lucide="user-plus" class="w-4 h-4"></i> Yeni Müşteri & Servis Aç
        </button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let html = '';
  displayList.forEach(c => {
    const devices = getCustomerDevices(c.id);
    const services = getCustomerServices(c.id);

    html += `
      <div class="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h4 onclick="viewCustomerHistory('${c.id}')" class="font-extrabold text-slate-800 text-base hover:text-sky-600 hover:underline cursor-pointer flex items-center gap-2 transition" title="Geçmişi ve Müşteri Profilini Gör">
                ${c.name}
              </h4>
              <div class="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                <i data-lucide="phone" class="w-3.5 h-3.5 text-sky-600"></i>
                <a href="tel:${c.phone}" class="text-sky-700 hover:underline font-semibold">${c.phone}</a>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="editCustomer('${c.id}')" title="Müşteriyi Düzenle" class="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition">
                <i data-lucide="edit" class="w-4 h-4"></i>
              </button>
              <button onclick="deleteCustomer('${c.id}')" title="Müşteriyi Sil" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <div class="mt-3 text-xs text-slate-600 space-y-1">
            <div class="flex items-start gap-1.5">
              <i data-lucide="map-pin" class="w-4 h-4 text-sky-600 shrink-0 mt-0.5"></i>
              <div>
                <span class="font-bold text-slate-800">${c.district || 'İstanbul'}</span> 
                ${c.neighborhood ? '• <span class="font-semibold text-slate-700">' + c.neighborhood + '</span>' : ''}
                <div class="text-slate-500 text-[11px] mt-0.5 line-clamp-2">${c.address || 'Açık adres girilmedi'}</div>
              </div>
            </div>
            ${c.notes ? `
              <div class="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-100 mt-2 flex items-center gap-1">
                <i data-lucide="info" class="w-3 h-3 shrink-0"></i> Not: ${c.notes}
              </div>
            ` : ''}
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Kayıtlı Cihazlar (${devices.length})</span>
              <button onclick="openAddDeviceModal('${c.id}')" class="text-sky-600 hover:text-sky-800 font-bold lowercase first-letter:uppercase flex items-center gap-0.5">
                <i data-lucide="plus" class="w-3 h-3"></i> cihaz ekle
              </button>
            </div>
            
            <div class="space-y-1.5">
              ${devices.length === 0 ? `
                <div class="text-xs text-slate-400 italic">Cihaz kaydı yok.</div>
              ` : devices.map(d => `
                <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg flex items-center justify-center ${d.type === 'kombi' ? 'bg-orange-100 text-orange-600' : 'bg-cyan-100 text-cyan-600'}">
                      <i data-lucide="${d.type === 'kombi' ? 'flame' : 'snowflake'}" class="w-3.5 h-3.5"></i>
                    </span>
                    <div>
                      <span class="font-semibold text-slate-700">${d.brand} ${d.model || ''}</span>
                      <span class="text-[10px] text-slate-400 uppercase block">${d.type}</span>
                    </div>
                  </div>
                  <button onclick="startNewServiceForCustomer('${c.id}', '${d.id}')" class="px-2 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 rounded-lg text-[11px] font-medium shadow-xs">
                    Servis Aç
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
          <div class="flex items-center gap-1.5">
            <a href="tel:${c.phone}" class="p-2 bg-slate-100 hover:bg-sky-50 hover:text-sky-600 text-slate-600 rounded-xl transition" title="Ara">
              <i data-lucide="phone-call" class="w-4 h-4"></i>
            </a>
            <a href="https://wa.me/90${c.phone.replace(/\D/g, '').replace(/^0/, '')}" target="_blank" class="p-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 rounded-xl transition" title="WhatsApp Aç">
              <i data-lucide="message-circle" class="w-4 h-4"></i>
            </a>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((c.address || '') + ' ' + (c.neighborhood || '') + ' ' + (c.district || '') + ' İstanbul')}" target="_blank" class="p-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-xl transition" title="Haritada Aç">
              <i data-lucide="map" class="w-4 h-4"></i>
            </a>
          </div>

          <div class="flex items-center gap-1.5 ml-auto">
            <button onclick="viewCustomerHistory('${c.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 transition">
              <i data-lucide="history" class="w-3.5 h-3.5 text-slate-500"></i> Geçmiş (${services.length})
            </button>
            <button onclick="startNewServiceForCustomer('${c.id}')" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition shadow-xs active:scale-95">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Servis Aç
            </button>
          </div>
        </div>
      </div>
    `;
  });

  if (!isSearching && totalCount > state.customersPageLimit) {
    html += `
      <div class="text-center pt-4 col-span-full">
        <button onclick="state.customersPageLimit += 40; renderCustomersList();" class="px-6 py-2.5 bg-white hover:bg-sky-50 text-sky-700 border border-slate-300 rounded-xl font-bold text-xs shadow-xs transition">
          Daha Fazla Müşteri Göster (Toplam ${totalCount} müşteriden ${displayList.length} gösteriliyor)
        </button>
      </div>
    `;
  }

  container.innerHTML = html;
  lucide.createIcons();
}

// -------------------------------------------------------------
// TAB 3: YILLIK BAKIM ZAMANI GELENLER
// -------------------------------------------------------------
function renderMaintenanceList() {
  const container = document.getElementById('maintenanceListContainer');
  if (!container) return;

  const dueList = calculateDueMaintenances();

  if (dueList.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
        <div class="w-16 h-16 mx-auto mb-4 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
          <i data-lucide="check-check" class="w-8 h-8"></i>
        </div>
        <h3 class="text-base font-semibold text-slate-800">Tüm Bakımlar Güncel!</h3>
        <p class="text-sm text-slate-500 mt-1">Şu anda 11 aydan daha uzun süredir bakımı yapılmamış herhangi bir cihaz bulunmuyor.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  let html = `
    <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex items-start gap-3">
      <div class="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
        <i data-lucide="bell-ring" class="w-5 h-5"></i>
      </div>
      <div>
        <h4 class="text-sm font-bold text-amber-900">Periyodik Yıllık Bakım Zamanı Gelen Müşteriler</h4>
        <p class="text-xs text-amber-700 mt-0.5">
          Aşağıdaki cihazların son işlem tarihinin üzerinden 1 yıldan fazla süre geçmiştir. Müşteriyi arayarak veya WhatsApp mesajı göndererek kışlık kombi / yazlık klima bakımı randevusu oluşturabilirsiniz.
        </p>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  `;

  dueList.forEach(item => {
    const isKombi = item.device.type === 'kombi';
    const months = Math.floor(item.daysAgo / 30);

    html += `
      <div class="bg-white rounded-2xl p-5 border border-amber-200/80 hover:shadow-md transition">
        <div class="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h4 class="font-bold text-slate-800 text-sm">${item.customer.name}</h4>
            <div class="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
              <i data-lucide="phone" class="w-3.5 h-3.5 text-sky-600"></i>
              <a href="tel:${item.customer.phone}" class="hover:underline">${item.customer.phone}</a>
            </div>
          </div>
          <span class="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">
            ${months} Ay Önce
          </span>
        </div>

        <div class="my-3 text-xs space-y-1.5">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg flex items-center justify-center ${isKombi ? 'bg-orange-100 text-orange-600' : 'bg-cyan-100 text-cyan-600'}">
              <i data-lucide="${isKombi ? 'flame' : 'snowflake'}" class="w-3.5 h-3.5"></i>
            </span>
            <span class="font-semibold text-slate-700">${item.device.brand} ${item.device.model || ''}</span>
          </div>
          <div class="text-slate-500 flex items-center gap-1">
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i> ${item.customer.district || ''} ${item.customer.neighborhood ? '• ' + item.customer.neighborhood : ''}
          </div>
          <div class="text-slate-500 flex items-center gap-1">
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i> Son İşlem: <span class="font-medium text-slate-700">${formatDate(item.lastDateStr)}</span>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button onclick="sendMaintenanceWhatsApp('${item.customer.id}', '${item.device.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs">
            <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp ile Hatırlat
          </button>
          <button onclick="openUnifiedServiceModal('existing', '${item.customer.id}', '${item.device.id}', true)" class="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Randevu Aç
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
  lucide.createIcons();
}

// -------------------------------------------------------------
// TAB 4: KASA & FİNANS TAKİBİ
// -------------------------------------------------------------
function renderFinance() {
  const services = state.data.services;
  let totalParts = 0;
  let totalLabor = 0;
  let totalRevenue = 0;
  let totalCollected = 0;
  let totalDebt = 0;

  const debtServices = [];

  services.forEach(s => {
    totalParts += Number(s.partsTotal || 0);
    totalLabor += Number(s.laborCost || 0);
    totalRevenue += Number(s.totalAmount || 0);
    totalCollected += Number(s.paidAmount || 0);

    const rem = Number(s.remainingAmount || 0);
    if (rem > 0) {
      totalDebt += rem;
      debtServices.push(s);
    }
  });

  const elFinRevenue = document.getElementById('finRevenue');
  const elFinCollected = document.getElementById('finCollected');
  const elFinDebt = document.getElementById('finDebt');
  const elFinLabor = document.getElementById('finLabor');
  const elFinParts = document.getElementById('finParts');

  if (elFinRevenue) elFinRevenue.innerText = formatMoney(totalRevenue);
  if (elFinCollected) elFinCollected.innerText = formatMoney(totalCollected);
  if (elFinDebt) elFinDebt.innerText = formatMoney(totalDebt);
  if (elFinLabor) elFinLabor.innerText = formatMoney(totalLabor);
  if (elFinParts) elFinParts.innerText = formatMoney(totalParts);

  const debtContainer = document.getElementById('financeDebtListContainer');
  if (debtContainer) {
    if (debtServices.length === 0) {
      debtContainer.innerHTML = `
        <div class="p-8 text-center text-slate-500 text-sm">
          <i data-lucide="party-popper" class="w-8 h-8 mx-auto mb-2 text-emerald-500"></i>
          Harika! Tahsil edilmemiş borçlu servis kaydı yok.
        </div>
      `;
    } else {
      let dHtml = `
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th class="p-3">Fiş No / Tarih</th>
                <th class="p-3">Müşteri</th>
                <th class="p-3">Telefon</th>
                <th class="p-3">Toplam Tutar</th>
                <th class="p-3">Ödenen</th>
                <th class="p-3 text-red-600">Kalan Borç</th>
                <th class="p-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
      `;

      debtServices.slice(0, 50).forEach(s => {
        const cust = getCustomer(s.customerId) || { name: '-', phone: '-' };
        dHtml += `
          <tr class="hover:bg-slate-50">
            <td class="p-3 font-mono font-medium">${s.slipNo || '-'}<div class="text-[10px] text-slate-400 font-sans">${formatDate(s.date)}</div></td>
            <td class="p-3 font-semibold text-slate-800">${cust.name}</td>
            <td class="p-3"><a href="tel:${cust.phone}" class="text-sky-600 hover:underline">${cust.phone}</a></td>
            <td class="p-3 font-medium">${formatMoney(s.totalAmount)}</td>
            <td class="p-3 text-emerald-600 font-medium">${formatMoney(s.paidAmount)}</td>
            <td class="p-3 font-bold text-red-600">${formatMoney(s.remainingAmount)}</td>
            <td class="p-3 text-right">
              <button onclick="editService('${s.id}')" class="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg font-medium transition">
                Tahsilat Gir
              </button>
            </td>
          </tr>
        `;
      });

      dHtml += `
            </tbody>
          </table>
        </div>
      `;
      debtContainer.innerHTML = dHtml;
    }
  }

  lucide.createIcons();
}

// -------------------------------------------------------------
// TAB 5: AYARLAR VE YEDEKLEME
// -------------------------------------------------------------
function renderSettings() {
  const set = state.data.settings || {};
  const setBusinessName = document.getElementById('setBusinessName');
  const setOwnerName = document.getElementById('setOwnerName');
  const setPhone = document.getElementById('setPhone');
  const setEmail = document.getElementById('setEmail');
  const setAddress = document.getElementById('setAddress');
  const setTaxInfo = document.getElementById('setTaxInfo');
  const setServiceTerms = document.getElementById('setServiceTerms');

  if (setBusinessName) setBusinessName.value = set.businessName || 'ustatamirci';
  if (setOwnerName) setOwnerName.value = set.ownerName || '';
  if (setPhone) setPhone.value = set.phone || '';
  if (setEmail) setEmail.value = set.email || '';
  if (setAddress) setAddress.value = set.address || '';
  if (setTaxInfo) setTaxInfo.value = set.taxInfo || '';
  if (setServiceTerms) setServiceTerms.value = set.serviceTerms || '';
}

function saveSettingsFromForm(e) {
  if (e) e.preventDefault();
  state.data.settings = {
    businessName: document.getElementById('setBusinessName').value.trim() || 'ustatamirci',
    ownerName: document.getElementById('setOwnerName').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    address: document.getElementById('setAddress').value.trim(),
    taxInfo: document.getElementById('setTaxInfo').value.trim(),
    serviceTerms: document.getElementById('setServiceTerms').value.trim(),
    warrantyMonths: 12
  };
  saveData();
  alert("Ayarlar başarıyla kaydedildi!");
  renderAll();
}

function exportBackupJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.data, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `ustatamirci_yedek_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importBackupJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.customers && imported.services && imported.devices) {
        if (confirm("Mevcut verilerin üzerine yedek yüklensin mi?")) {
          state.data = imported;
          saveData();
          renderAll();
          alert("Yedek başarıyla geri yüklendi!");
        }
      } else {
        alert("Geçersiz yedek dosyası formatı!");
      }
    } catch (err) {
      alert("Dosya okunurken hata oluştu: " + err.message);
    }
  };
  reader.readAsText(file);
}

function resetToSampleData() {
  if (confirm("Tüm veriler sıfırlanıp PDF'ten aktarılan 395 müşteri kaydı geri yüklensin mi?")) {
    state.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    saveData();
    renderAll();
    alert("395 müşteri kaydı geri yüklendi!");
  }
}

// -------------------------------------------------------------
// BİRLEŞİK YENİ MÜŞTERİ & SERVİS MODAL YÖNETİMİ
// -------------------------------------------------------------
function setServiceMode(mode) {
  state.serviceModalMode = mode;
  const secNew = document.getElementById('sectionNewCustomer');
  const secExisting = document.getElementById('sectionExistingCustomer');
  const btnNew = document.getElementById('btnModeNew');
  const btnExisting = document.getElementById('btnModeExisting');
  const submitText = document.getElementById('btnSubmitServiceText');

  const newCustName = document.getElementById('newCustName');
  const newCustPhone = document.getElementById('newCustPhone');
  const newCustDistrict = document.getElementById('newCustDistrict');
  const newDevBrand = document.getElementById('newDevBrand');
  const srvCustSelect = document.getElementById('srvCustomerId');

  if (mode === 'new') {
    secNew.classList.remove('hidden');
    secExisting.classList.add('hidden');

    btnNew.className = 'py-2 rounded-lg text-sky-700 bg-white shadow-xs transition flex items-center justify-center gap-1.5';
    btnExisting.className = 'py-2 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5';

    if (newCustName) newCustName.required = true;
    if (newCustPhone) newCustPhone.required = true;
    if (newCustDistrict) newCustDistrict.required = true;
    if (newDevBrand) newDevBrand.required = true;
    if (srvCustSelect) srvCustSelect.required = false;

    if (submitText) submitText.innerText = 'Müşteri & Servis Randevusunu Oluştur';
  } else {
    secNew.classList.add('hidden');
    secExisting.classList.remove('hidden');

    btnExisting.className = 'py-2 rounded-lg text-sky-700 bg-white shadow-xs transition flex items-center justify-center gap-1.5';
    btnNew.className = 'py-2 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1.5';

    if (newCustName) newCustName.required = false;
    if (newCustPhone) newCustPhone.required = false;
    if (newCustDistrict) newCustDistrict.required = false;
    if (newDevBrand) newDevBrand.required = false;
    if (srvCustSelect) srvCustSelect.required = true;

    if (submitText) submitText.innerText = 'Servis Randevusunu Kaydet';
  }
}

function openUnifiedServiceModal(mode = 'new', preCustomerId = null, preDeviceId = null, isMaint = false) {
  state.editingServiceId = null;
  const modal = document.getElementById('serviceModal');
  const form = document.getElementById('serviceForm');
  form.reset();

  document.getElementById('customerTypeSelector').classList.remove('hidden');
  document.getElementById('serviceModalTitle').innerHTML = '<i data-lucide="clipboard-pen" class="w-5 h-5 text-sky-600"></i> Yeni Servis Kaydı Aç';
  document.getElementById('serviceModalSubtitle').innerText = 'Müşteri ve randevu bilgilerini girip istediğiniz tarihe servis oluşturun.';

  initDistrictsDropdowns();
  const neighborhoodSelect = document.getElementById('newCustNeighborhood');
  if (neighborhoodSelect) neighborhoodSelect.innerHTML = '<option value="">-- Önce İlçe Seçin --</option>';

  const custSelect = document.getElementById('srvCustomerId');
  custSelect.innerHTML = '<option value="">-- Müşteri Seçin --</option>' + 
    state.data.customers.map(c => `<option value="${c.id}">${c.name} (${c.phone}) - ${c.district || ''}</option>`).join('');

  if (preCustomerId) {
    custSelect.value = preCustomerId;
    setServiceMode('existing');
  } else {
    setServiceMode(mode);
  }

  updateDeviceOptionsForSelectedCustomer(preDeviceId);

  const nextNum = (state.data.services.length + 1).toString().padStart(3, '0');
  const curYear = new Date().getFullYear();
  const slipNo = `SRV-${curYear}-${nextNum}`;
  document.getElementById('srvSlipNo').value = slipNo;
  document.getElementById('srvSlipNoBadge').innerText = slipNo;

  document.getElementById('srvDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('srvTime').value = '14:00';
  document.getElementById('srvStatus').value = 'pending';

  if (isMaint) {
    document.getElementById('srvFault').value = 'Periyodik Yıllık Bakım ve Temizlik';
    document.getElementById('srvLabor').value = '900';
  } else {
    document.getElementById('srvLabor').value = '0';
  }

  
  document.getElementById('partsContainer').innerHTML = '';
  calcServiceTotals();

  modal.classList.remove('hidden');
  lucide.createIcons();
}

function onCustomerChangeInServiceModal() {
  updateDeviceOptionsForSelectedCustomer();
}

function updateDeviceOptionsForSelectedCustomer(preSelectedDeviceId = null) {
  const custId = document.getElementById('srvCustomerId').value;
  const devSelect = document.getElementById('srvDeviceId');

  if (!custId) {
    devSelect.innerHTML = '<option value="">-- Önce Müşteri Seçin --</option>';
    return;
  }

  const devices = getCustomerDevices(custId);
  if (devices.length === 0) {
    devSelect.innerHTML = '<option value="">(Bu müşteriye kayıtlı cihaz yok - yeni eklenecektir)</option>';
  } else {
    devSelect.innerHTML = devices.map(d => `
      <option value="${d.id}">${(d.type || '').toUpperCase()}: ${d.brand} ${d.model || ''}</option>
    `).join('');
  }

  if (preSelectedDeviceId) {
    devSelect.value = preSelectedDeviceId;
  } else if (devices.length > 0) {
    devSelect.value = devices[0].id;
  }
}

function handleUnifiedServiceSubmit(e) {
  e.preventDefault();

  let targetCustomerId = null;
  let targetDeviceId = null;

  if (state.editingServiceId) {
    const existing = state.data.services.find(s => s.id === state.editingServiceId);
    if (!existing) return;
    targetCustomerId = existing.customerId;
    targetDeviceId = existing.deviceId;
  } else if (state.serviceModalMode === 'new') {
    const custName = document.getElementById('newCustName').value.trim();
    const custPhone = document.getElementById('newCustPhone').value.trim();
    const custDistrict = document.getElementById('newCustDistrict').value;
    const custNeighborhood = document.getElementById('newCustNeighborhood').value;
    const custAddress = document.getElementById('newCustAddress').value.trim();

    if (!custName || !custPhone || !custDistrict) {
      alert("Lütfen Müşteri Adı, Telefonu ve İlçesini eksiksiz doldurunuz!");
      return;
    }

    const cleanInputPhone = custPhone.replace(/\D/g, '').replace(/^0/, '');
    const existingCust = state.data.customers.find(c => (c.phone || '').replace(/\D/g, '').replace(/^0/, '') === cleanInputPhone);

    if (existingCust) {
      targetCustomerId = existingCust.id;
      existingCust.name = custName;
      existingCust.district = custDistrict;
      if (custNeighborhood && custNeighborhood !== 'Diğer') existingCust.neighborhood = custNeighborhood;
      existingCust.address = custAddress;
    } else {
      targetCustomerId = 'cust-' + Date.now();
      const newCustomer = {
        id: targetCustomerId,
        name: custName,
        phone: custPhone,
        city: 'İstanbul',
        district: custDistrict,
        neighborhood: (custNeighborhood && custNeighborhood !== 'Diğer') ? custNeighborhood : '',
        address: custAddress,
        notes: '',
        createdAt: new Date().toISOString().split('T')[0]
      };
      state.data.customers.unshift(newCustomer);
    }

    const devType = document.getElementById('newDevType').value;
    const devBrand = document.getElementById('newDevBrand').value.trim() || 'Genel';
    const devModel = document.getElementById('newDevModel').value.trim() || '';

    const existingDev = state.data.devices.find(d => d.customerId === targetCustomerId && d.type === devType && (d.brand || '').toLowerCase() === devBrand.toLowerCase());

    if (existingDev) {
      targetDeviceId = existingDev.id;
      if (devModel) existingDev.model = devModel;
    } else {
      targetDeviceId = 'dev-' + Date.now();
      const newDevice = {
        id: targetDeviceId,
        customerId: targetCustomerId,
        type: devType,
        brand: devBrand,
        model: devModel
      };
      state.data.devices.push(newDevice);
    }

  } else {
    targetCustomerId = document.getElementById('srvCustomerId').value;
    if (!targetCustomerId) {
      alert("Lütfen bir müşteri seçiniz!");
      return;
    }

    targetDeviceId = document.getElementById('srvDeviceId').value;
    if (!targetDeviceId) {
      targetDeviceId = 'dev-' + Date.now();
      state.data.devices.push({
        id: targetDeviceId,
        customerId: targetCustomerId,
        type: 'kombi',
        brand: 'Genel',
        model: 'Standart'
      });
    }
  }

  const partRows = document.querySelectorAll('#partsContainer > div');
  const parts = [];
  let partsTotal = 0;

  partRows.forEach(row => {
    const name = row.querySelector('.part-name')?.value.trim();
    const qty = Number(row.querySelector('.part-qty')?.value || 1);
    const price = Number(row.querySelector('.part-price')?.value || 0);
    if (name) {
      parts.push({ name, qty, price });
      partsTotal += (qty * price);
    }
  });

  const labor = Number(document.getElementById('srvLabor').value || 0);
  const totalAmount = partsTotal + labor;
  const paidAmount = totalAmount;
  const remainingAmount = 0;
  const status = document.getElementById('srvStatus').value;
  const srvDate = document.getElementById('srvDate').value;
  const srvTime = document.getElementById('srvTime').value;
  const srvFault = document.getElementById('srvFault').value.trim();
  const srvAction = document.getElementById('srvAction').value.trim();
  const srvSlip = document.getElementById('srvSlipNo').value.trim();

  const servicePayload = {
    id: state.editingServiceId || ('srv-' + Date.now()),
    slipNo: srvSlip,
    customerId: targetCustomerId,
    deviceId: targetDeviceId,
    date: srvDate,
    appointmentTime: srvTime,
    status: status,
    faultDescription: srvFault,
    actionTaken: srvAction,
    parts: parts,
    partsTotal: partsTotal,
    laborCost: labor,
    totalAmount: totalAmount,
    paidAmount: paidAmount,
    remainingAmount: remainingAmount,
    paymentMethod: document.getElementById('srvPaymentMethod').value,
    isMaintenance: srvFault.toLowerCase().includes('bakım'),
    completedAt: status === 'completed' ? srvDate : null
  };

  if (state.editingServiceId) {
    const idx = state.data.services.findIndex(s => s.id === state.editingServiceId);
    if (idx !== -1) state.data.services[idx] = servicePayload;
  } else {
    state.data.services.unshift(servicePayload);
  }

  saveData();
  closeModal('serviceModal');
  renderAll();

  if (state.viewingCustomerId && state.viewingCustomerId === targetCustomerId) {
    viewCustomerHistory(targetCustomerId);
  }

  const custObj = getCustomer(targetCustomerId);
  alert(`✅ Müşteri ve Servis Kaydı Başarıyla Oluşturuldu!\n\nMüşteri: ${custObj?.name}\nTarih: ${formatDate(srvDate)} (${srvTime || 'Saat belirtilmedi'})\nDurum: ${status === 'pending' ? 'Randevu Verildi' : status}`);
}

function editService(id) {
  const s = state.data.services.find(item => item.id === id);
  if (!s) return;

  closeModal('historyModal');
  state.editingServiceId = id;
  const modal = document.getElementById('serviceModal');

  document.getElementById('customerTypeSelector').classList.add('hidden');
  setServiceMode('existing');

  document.getElementById('serviceModalTitle').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-sky-600"></i> Servis Kaydını Düzenle';
  document.getElementById('serviceModalSubtitle').innerText = `${s.slipNo || ''} numaralı servis kaydını ve yapılan işlemleri güncelleyin.`;
  document.getElementById('btnSubmitServiceText').innerText = 'Değişiklikleri Kaydet';

  const custSelect = document.getElementById('srvCustomerId');
  custSelect.innerHTML = state.data.customers.map(c => `
    <option value="${c.id}" ${c.id === s.customerId ? 'selected' : ''}>${c.name} (${c.phone})</option>
  `).join('');

  updateDeviceOptionsForSelectedCustomer(s.deviceId);

  document.getElementById('srvSlipNo').value = s.slipNo || '';
  document.getElementById('srvSlipNoBadge').innerText = s.slipNo || '';
  document.getElementById('srvDate').value = s.date || '';
  document.getElementById('srvTime').value = s.appointmentTime || '';
  document.getElementById('srvStatus').value = s.status || 'pending';
  document.getElementById('srvFault').value = s.faultDescription || '';
  document.getElementById('srvAction').value = s.actionTaken || '';
  document.getElementById('srvLabor').value = s.laborCost || 0;
  document.getElementById('srvPaymentMethod').value = s.paymentMethod || 'Nakit';

  const partsContainer = document.getElementById('partsContainer');
  partsContainer.innerHTML = '';
  if (s.parts && s.parts.length > 0) {
    s.parts.forEach(p => addPartRow(p.name, p.qty, p.price));
  }

  calcServiceTotals();
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function updateServiceStatus(id, newStatus) {
  const s = state.data.services.find(item => item.id === id);
  if (s) {
    s.status = newStatus;
    if (newStatus === 'completed' && !s.completedAt) {
      s.completedAt = new Date().toISOString().split('T')[0];
    }
    saveData();
    renderAll();
  }
}

function deleteService(id) {
  if (confirm("Bu servis kaydını silmek istediğinize emin misiniz?")) {
    state.data.services = state.data.services.filter(s => s.id !== id);
    saveData();
    renderAll();
  }
}

function addPartRow(name = '', qty = 1, price = 0) {
  const container = document.getElementById('partsContainer');
  const rowId = 'part-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

  const div = document.createElement('div');
  div.className = 'grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs';
  div.id = rowId;
  div.innerHTML = `
    <div class="col-span-6">
      <input type="text" placeholder="Yedek Parça Adı (Örn: NTC Sensör, 3 Yollu Vana)" value="${name}" class="part-name w-full border border-slate-300 rounded-lg p-1.5 focus:outline-none focus:border-sky-500 bg-white" required>
    </div>
    <div class="col-span-2">
      <input type="number" min="1" placeholder="Adet" value="${qty}" oninput="calcServiceTotals()" class="part-qty w-full border border-slate-300 rounded-lg p-1.5 text-center focus:outline-none focus:border-sky-500 bg-white" required>
    </div>
    <div class="col-span-3">
      <input type="number" min="0" step="50" placeholder="Fiyat (TL)" value="${price}" oninput="calcServiceTotals()" class="part-price w-full border border-slate-300 rounded-lg p-1.5 text-right focus:outline-none focus:border-sky-500 bg-white" required>
    </div>
    <div class="col-span-1 text-center">
      <button type="button" onclick="removePartRow('${rowId}')" class="text-slate-400 hover:text-red-600 p-1">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
  `;
  container.appendChild(div);
  lucide.createIcons();
  calcServiceTotals();
}

function removePartRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
  calcServiceTotals();
}

function calcServiceTotals() {
  const partRows = document.querySelectorAll('#partsContainer > div');
  let partsTotal = 0;

  partRows.forEach(row => {
    const qty = Number(row.querySelector('.part-qty')?.value || 1);
    const price = Number(row.querySelector('.part-price')?.value || 0);
    partsTotal += (qty * price);
  });

  const labor = Number(document.getElementById('srvLabor')?.value || 0);
  const total = partsTotal + labor;
  

  const partsTotalEl = document.getElementById('srvPartsTotalDisplay');
  const totalAmountEl = document.getElementById('srvTotalAmount');
  const totalDisplayEl = document.getElementById('srvTotalDisplay');
  if (partsTotalEl) partsTotalEl.innerText = formatMoney(partsTotal);
  if (totalAmountEl) totalAmountEl.value = total;
  if (totalDisplayEl) totalDisplayEl.innerText = formatMoney(total);
  
}

// -------------------------------------------------------------
// CUSTOMER EDIT & DEVICE MODAL
// -------------------------------------------------------------
function editCustomer(id) {
  const c = getCustomer(id);
  if (!c) return;

  state.editingCustomerId = id;
  document.getElementById('custName').value = c.name || '';
  document.getElementById('custPhone').value = c.phone || '';
  document.getElementById('custAddress').value = c.address || '';
  document.getElementById('custNotes').value = c.notes || '';

  initDistrictsDropdowns();
  const districtSelect = document.getElementById('custDistrict');
  if (districtSelect) {
    districtSelect.value = c.district || '';
    onCustomerModalDistrictChange(c.district, c.neighborhood);
  }

  document.getElementById('customerModal').classList.remove('hidden');
  lucide.createIcons();
}

function saveCustomerForm(e) {
  e.preventDefault();

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const district = document.getElementById('custDistrict').value;
  const neighborhood = document.getElementById('custNeighborhood').value;

  if (!name || !phone || !district) {
    alert("Ad, Telefon ve İlçe zorunludur!");
    return;
  }

  const idx = state.data.customers.findIndex(c => c.id === state.editingCustomerId);
  if (idx !== -1) {
    state.data.customers[idx].name = name;
    state.data.customers[idx].phone = phone;
    state.data.customers[idx].district = district;
    state.data.customers[idx].neighborhood = (neighborhood && neighborhood !== 'Diğer') ? neighborhood : '';
    state.data.customers[idx].address = document.getElementById('custAddress').value.trim();
    state.data.customers[idx].notes = document.getElementById('custNotes').value.trim();
  }

  saveData();
  closeModal('customerModal');
  renderAll();
}

function deleteCustomer(id) {
  const cust = getCustomer(id);
  if (!cust) return;

  if (confirm(`"${cust.name}" adlı müşteriyi ve ilişkili tüm cihaz/servis kayıtlarını silmek istediğinize emin misiniz?`)) {
    state.data.customers = state.data.customers.filter(c => c.id !== id);
    state.data.devices = state.data.devices.filter(d => d.customerId !== id);
    state.data.services = state.data.services.filter(s => s.customerId !== id);
    saveData();
    renderAll();
  }
}

function openAddDeviceModal(customerId) {
  const cust = getCustomer(customerId);
  if (!cust) return;

  document.getElementById('addDevCustomerId').value = customerId;
  document.getElementById('addDevCustomerName').innerText = cust.name;
  document.getElementById('addDeviceForm').reset();
  document.getElementById('addDeviceModal').classList.remove('hidden');
  lucide.createIcons();
}

function saveAddDeviceForm(e) {
  e.preventDefault();
  const custId = document.getElementById('addDevCustomerId').value;
  const brand = document.getElementById('modalNewDevBrand').value.trim();
  if (!brand) {
    alert("Cihaz markası zorunludur!");
    return;
  }

  const newDevice = {
    id: 'dev-' + Date.now(),
    customerId: custId,
    type: document.getElementById('modalNewDevType').value,
    brand: brand,
    model: document.getElementById('modalNewDevModel').value.trim()
  };

  state.data.devices.push(newDevice);
  saveData();
  closeModal('addDeviceModal');
  renderAll();
}

function startNewServiceForCustomer(customerId, deviceId = null) {
  closeModal('historyModal');
  openUnifiedServiceModal('existing', customerId, deviceId);
}

function viewCustomerHistory(customerId) {
  const cust = getCustomer(customerId);
  if (!cust) return;

  state.viewingCustomerId = customerId;

  const devices = getCustomerDevices(customerId);
  const services = getCustomerServices(customerId);

  // Müşteri Başlık Bilgileri
  const elName = document.getElementById('histCustName');
  if (elName) elName.innerText = cust.name || 'Müşteri';

  const elPhone = document.getElementById('histCustPhone');
  if (elPhone) elPhone.innerText = cust.phone || '-';

  const elDistrictBadge = document.getElementById('histCustDistrictBadge');
  if (elDistrictBadge) {
    elDistrictBadge.innerText = `${cust.district || 'İstanbul'}${cust.neighborhood ? ' • ' + cust.neighborhood : ''}`;
  }

  const elAddressBrief = document.getElementById('histCustAddressBrief');
  if (elAddressBrief) elAddressBrief.innerText = cust.address || 'Açık adres girilmedi';

  const elAddress = document.getElementById('histCustAddress');
  if (elAddress) {
    elAddress.innerText = `${cust.address || 'Açık adres belirtilmedi'} - ${cust.neighborhood || ''} ${cust.district || ''} / ${cust.city || 'İstanbul'}`;
  }

  // Müşteri Özel Notu
  const notesContainer = document.getElementById('histCustNotesContainer');
  const notesText = document.getElementById('histCustNotesText');
  if (notesContainer && notesText) {
    if (cust.notes && cust.notes.trim()) {
      notesText.innerText = cust.notes;
      notesContainer.classList.remove('hidden');
    } else {
      notesContainer.classList.add('hidden');
    }
  }

  // Hızlı İletişim Butonları
  const cleanPhone = (cust.phone || '').replace(/\D/g, '').replace(/^0/, '');
  const callBtn = document.getElementById('histPhoneCallBtn');
  if (callBtn) callBtn.href = `tel:${cust.phone || ''}`;

  const waBtn = document.getElementById('histWhatsAppBtn');
  if (waBtn) waBtn.href = `https://wa.me/90${cleanPhone}`;

  const mapsBtn = document.getElementById('histMapsBtn');
  if (mapsBtn) {
    const mapQuery = encodeURIComponent(`${cust.address || ''} ${cust.neighborhood || ''} ${cust.district || ''} İstanbul`);
    mapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  }

  // Kayıtlı Cihazlar
  const devContainer = document.getElementById('histDevicesContainer');
  if (devContainer) {
    if (devices.length === 0) {
      devContainer.innerHTML = `
        <div class="text-xs text-slate-400 italic py-1">
          Kayıtlı cihaz bulunmuyor. Yukarıdaki "+ Yeni Cihaz Ekle" butonundan kombi veya klima ekleyebilirsiniz.
        </div>
      `;
    } else {
      devContainer.innerHTML = devices.map(d => {
        const isKombi = (d.type || '').toLowerCase() === 'kombi';
        return `
          <div class="inline-flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span class="inline-flex items-center gap-1.5 font-bold text-slate-800">
              <i data-lucide="${isKombi ? 'flame' : 'snowflake'}" class="w-3.5 h-3.5 ${isKombi ? 'text-orange-600' : 'text-cyan-600'}"></i>
              ${d.brand} ${d.model || ''} <span class="text-[10px] text-slate-400 uppercase">(${(d.type || '').toUpperCase()})</span>
            </span>
            <button onclick="startNewServiceForCustomer('${cust.id}', '${d.id}')" class="px-2 py-0.5 bg-white hover:bg-sky-50 text-sky-700 border border-slate-200 rounded-lg text-[10px] font-bold transition shadow-2xs">
              + Bu Cihaza Servis Aç
            </button>
          </div>
        `;
      }).join('');
    }
  }

  // İstatistikler (Toplam Servis, Toplam Ciro, Tahsilat, Bakiye)
  let totalSpent = 0;
  

  services.forEach(s => {
    totalSpent += Number(s.totalAmount || 0);
    
  });

  const statCount = document.getElementById('histStatCount');
  const statTotal = document.getElementById('histStatTotal');
  const statPaid = document.getElementById('histStatPaid');
  const statDebt = document.getElementById('histStatDebt');

  if (statCount) statCount.innerText = services.length;
  if (statTotal) statTotal.innerText = formatMoney(totalSpent);
  if (statPaid) statPaid.innerText = formatMoney(totalPaid);
  if (statDebt) statDebt.innerText = formatMoney(totalDebt);

  // Servis Geçmişi Zaman Çizelgesi
  const srvContainer = document.getElementById('histServicesContainer');
  if (srvContainer) {
    if (services.length === 0) {
      srvContainer.innerHTML = `
        <div class="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs">
          <div class="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <i data-lucide="clipboard-x" class="w-6 h-6"></i>
          </div>
          <p class="font-bold text-slate-800 text-sm">Bu müşteriye ait servis kaydı bulunmuyor</p>
          <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Müşteri aradığında yeni arıza kaydı açabilir, parça ve işçilik işlemlerini kaydedebilirsiniz.</p>
          <button onclick="startNewServiceForCustomer('${cust.id}')" class="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs">
            <i data-lucide="plus" class="w-4 h-4"></i> Bu Müşteriye İlk Servis Kaydını Aç
          </button>
        </div>
      `;
    } else {
      srvContainer.innerHTML = services.map((s, idx) => {
        const dev = getDevice(s.deviceId) || { brand: 'Genel Cihaz', model: '', type: 'kombi' };
        const isKombi = (dev.type || '').toLowerCase() === 'kombi';
        const isDebt = Number(s.remainingAmount || 0) > 0;

        const statusMap = {
          pending: { label: 'Randevu / İşlemde', badgeClass: 'badge-pending' },
          in_progress: { label: 'İşlemde / Müdahale', badgeClass: 'badge-progress' },
          waiting_part: { label: 'Parça Bekliyor', badgeClass: 'badge-waiting' },
          completed: { label: 'Tamamlandı', badgeClass: 'badge-completed' },
          cancelled: { label: 'İptal', badgeClass: 'badge-cancelled' }
        };
        const st = statusMap[s.status] || { label: s.status, badgeClass: 'badge-pending' };

        // Parça dökümü
        let partsHtml = '';
        if (s.parts && s.parts.length > 0) {
          partsHtml = `
            <div class="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <span class="text-[10px] font-bold text-slate-400 uppercase">Değişen Parçalar:</span>
              ${s.parts.map(p => `
                <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200">
                  ${p.name} (${p.qty} ad. - ${formatMoney(p.price)})
                </span>
              `).join('')}
            </div>
          `;
        }

        return `
          <div class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-sky-300 shadow-xs transition duration-150">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono font-black text-xs px-2.5 py-1 bg-slate-900 text-white rounded-lg">
                  ${s.slipNo || 'SRV-000'}
                </span>
                <span class="badge ${st.badgeClass}">${st.label}</span>
                <span class="text-xs text-slate-600 font-bold flex items-center gap-1">
                  <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i> ${formatDate(s.date)}
                  ${s.appointmentTime ? '<span class="text-slate-400 font-normal">(' + s.appointmentTime + ')</span>' : ''}
                </span>
                <span class="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                  <i data-lucide="${isKombi ? 'flame' : 'snowflake'}" class="w-3 h-3 ${isKombi ? 'text-orange-500' : 'text-cyan-500'}"></i>
                  ${dev.brand} ${dev.model || ''}
                </span>
              </div>

              <div class="text-right">
                <span class="font-black text-slate-900 text-base sm:text-lg text-emerald-700">
                  ${formatMoney(s.totalAmount)}
                </span>
                <div class="text-[11px] ${isDebt ? 'text-rose-600 font-bold' : 'text-emerald-600 font-semibold'}">
                  ${isDebt ? `Kalan Borç: ${formatMoney(s.remainingAmount)}` : '✅ Ödendi'}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 text-xs">
              <div class="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                <span class="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">Arıza / Şikayet</span>
                <div class="font-semibold text-slate-800">
                  ${s.faultDescription || 'Belirtilmedi'}
                </div>
              </div>

              <div class="bg-sky-50/50 p-2.5 rounded-xl border border-sky-100">
                <span class="text-[10px] font-bold text-sky-800 uppercase block mb-0.5">Yapılan İşlem & Onarım</span>
                <div class="font-semibold text-slate-800">
                  ${s.actionTaken || 'İşlem notu girilmedi'}
                </div>
              </div>
            </div>

            ${partsHtml}

            <div class="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 flex-wrap">
              <div class="flex items-center gap-2">
                <button onclick="editService('${s.id}')" class="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-sky-200">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Bu Kaydı Düzenle
                </button>
                <button onclick="openPrintModal('${s.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
                  <i data-lucide="printer" class="w-3.5 h-3.5"></i> Servis Fişi (A4/PDF)
                </button>
                <button onclick="sendWhatsAppService('${s.id}')" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-emerald-200">
                  <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp
                </button>
              </div>

              <button onclick="deleteService('${s.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition ml-auto" title="Kaydı Sil">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  document.getElementById('historyModal').classList.remove('hidden');
  lucide.createIcons();
}

// -------------------------------------------------------------
// PRINT & WHATSAPP INTEGRATION
// -------------------------------------------------------------
function openPrintModal(serviceId) {
  const s = state.data.services.find(item => item.id === serviceId);
  if (!s) return;

  state.printingServiceId = serviceId;
  const cust = getCustomer(s.customerId) || { name: '-', phone: '-', address: '-', district: '-' };
  const dev = getDevice(s.deviceId) || { type: 'Cihaz', brand: '-', model: '' };
  const settings = state.data.settings || {};

  document.getElementById('slipBusinessName').innerText = settings.businessName || 'ustatamirci';
  document.getElementById('slipBusinessContact').innerText = `Tel: ${settings.phone || '-'} • ${settings.address || ''}`;
  document.getElementById('slipTaxInfo').innerText = settings.taxInfo || '';
  
  document.getElementById('slipNoDisplay').innerText = s.slipNo || 'SRV-001';
  document.getElementById('slipDateDisplay').innerText = formatDate(s.date);
  
  document.getElementById('slipCustName').innerText = cust.name;
  document.getElementById('slipCustPhone').innerText = cust.phone;
  document.getElementById('slipCustAddress').innerText = `${cust.address || ''} ${cust.neighborhood || ''} ${cust.district || ''} / ${cust.city || 'İstanbul'}`;

  document.getElementById('slipDevType').innerText = (dev.type || '').toUpperCase();
  document.getElementById('slipDevBrand').innerText = `${dev.brand} ${dev.model || ''}`;

  document.getElementById('slipFault').innerText = s.faultDescription || 'Belirtilmedi';
  document.getElementById('slipAction').innerText = s.actionTaken || 'İşlem bilgisi girilmedi';

  const partsTable = document.getElementById('slipPartsBody');
  if (s.parts && s.parts.length > 0) {
    partsTable.innerHTML = s.parts.map(p => `
      <tr class="border-b border-slate-200">
        <td class="py-2 text-left">${p.name}</td>
        <td class="py-2 text-center">${p.qty} Adet</td>
        <td class="py-2 text-right">${formatMoney(p.price)}</td>
        <td class="py-2 text-right font-semibold">${formatMoney(p.qty * p.price)}</td>
      </tr>
    `).join('');
  } else {
    partsTable.innerHTML = `
      <tr class="border-b border-slate-200">
        <td colspan="4" class="py-2 text-slate-400 italic text-center">Yedek parça değişimi yapılmadı (Sadece servis & bakım işçiliği).</td>
      </tr>
    `;
  }

  document.getElementById('slipPartsTotal').innerText = formatMoney(s.partsTotal);
  document.getElementById('slipLaborTotal').innerText = formatMoney(s.laborCost);
  document.getElementById('slipGrandTotal').innerText = formatMoney(s.totalAmount);
  

  document.getElementById('slipTerms').innerText = settings.serviceTerms || 'Değiştirilen parçalar 1 yıl ustatamirci garantisindedir.';

  document.getElementById('printSlipModal').classList.remove('hidden');
  lucide.createIcons();
}

function triggerPrint() {
  window.print();
}

async function sendWhatsAppService(serviceId) {
  const s = state.data.services.find(item => item.id === serviceId);
  if (!s) return;
  const cust = getCustomer(s.customerId);
  if (!cust || !cust.phone) {
    alert("Müşteri telefon numarası bulunamadı!");
    return;
  }
  const cleanPhone = cust.phone.replace(/\D/g, '').replace(/^0/, '');
  const settings = state.data.settings || {};
  
  // Eğer servis henüz "Randevu Verildi" (pending) aşamasındaysa, resim yerine Randevu Bilgi Mesajı atalım.
  if (s.status === 'pending') {
    const dev = getDevice(s.deviceId) || { brand: 'Cihaz', type: '' };
    const dateStr = formatDate(s.date);
    const msg = `Sayın *${cust.name}*,\n\n` + 
                `*${settings.businessName || 'ustatamirci'}* olarak ${dev.brand} ${dev.type} servis randevunuz *${dateStr}* tarihi için oluşturulmuştur.\n\n` +
                `Ekiplerimiz gelmeden önce sizi arayıp net saat bilgisi verecektir. Bizi tercih ettiğiniz için teşekkür ederiz.\n\n` + 
                `📞 İletişim: ${settings.phone || '-'}`;
    
    window.open(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    return;
  }

  // Fişi ekranda görünür hale getirmek için modalı açıyoruz (html2canvas görünmezleri çekemez)
  openPrintModal(serviceId);
  
  // DOM'un güncellenmesi ve modalın açılması için kısa bir süre bekliyoruz
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const invoiceElement = document.getElementById('printableInvoice');

  // Fallback to text if no html2canvas
  if (typeof html2canvas === 'undefined' || !invoiceElement) {
    const statusTr = s.status === 'completed' ? 'Tamamlandı' : (s.status === 'waiting_part' ? 'Parça Bekliyor' : 'İşlemde');
    const msg = `Sayın *${cust.name}*,\nServis işleminiz (${statusTr}) sistemimize kaydedilmiştir.\nBizi tercih ettiğiniz için teşekkür ederiz.`;
    window.open(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    return;
  }

  try {
    const canvas = await html2canvas(invoiceElement, {
      scale: 2, 
      backgroundColor: '#ffffff'
    });
    
    canvas.toBlob(async (blob) => {
      closeModal('printSlipModal');
      const file = new File([blob], `Servis_Formu_${s.slipNo || '001'}.png`, { type: 'image/png' });
      
      // Mobile Web Share API
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Servis Formu',
            text: `Sayın ${cust.name}, servis işleminizin detaylarını içeren form ekte sunulmuştur.`,
            files: [file]
          });
        } catch (e) {
          console.log('Paylaşım iptal edildi veya hata oluştu', e);
        }
      } else {
        // Desktop / Unsupported Fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        const msg = `Sayın ${cust.name}, servis formunuz cihazıma (resim olarak) kaydedildi. Size hemen dosyalarım arasından iletiyorum.`;
        setTimeout(() => {
          window.open(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
        }, 500);
      }
    }, 'image/png');
    
  } catch(e) {
    console.error("Görsel oluşturulamadı:", e);
    alert("Form resmi oluşturulurken bir hata oluştu.");
  }
}

function sendMaintenanceWhatsApp(customerId, deviceId) {
  const cust = getCustomer(customerId);
  const dev = getDevice(deviceId);
  const settings = state.data.settings || {};

  if (!cust || !cust.phone) {
    alert("Müşteri telefonu bulunamadı!");
    return;
  }

  const cleanPhone = cust.phone.replace(/\D/g, '').replace(/^0/, '');
  const isKombi = dev.type === 'kombi';

  const msg = `Merhaba *${cust.name} Bey/Hanım*,\n\n` +
    `*${settings.businessName || 'ustatamirci'}* olarak hatırlatmak isteriz:\n` +
    `Kayıtlarımızda bulunan *${dev.brand} ${dev.model || ''}* ${isKombi ? 'kombinizin' : 'klimanızın'} yıllık periyodik bakım süresi dolmuştur.\n\n` +
    (isKombi ? 
      `🔥 Kış aylarına girmeden önce yüksek doğalgaz faturalarından kaçınmak, cihaz ömrünü uzatmak ve güvenli kullanım için yıllık bakımınızı yaptırmanızı tavsiye ederiz.` :
      `❄️ Sıcak havalarda yüksek elektrik faturasını önlemek ve temiz hava solumak için klima bakım & dezenfeksiyonunuzu yaptırmanızı öneririz.`
    ) +
    `\n\n🗓️ Size uygun bir güne bakım randevusu oluşturmak için bu mesaja yanıt verebilir veya bizi *${settings.phone || ''}* numarasından arayabilirsiniz.\n\nİyi günler dileriz!`;

  const waUrl = `https://wa.me/90${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

// -------------------------------------------------------------
// FİYAT TEKLİFLERİ (PROPOSALS) YÖNETİMİ
// -------------------------------------------------------------

function setProposalFilter(filter) {
  state.proposalFilter = filter;
  document.querySelectorAll('.prop-filter-btn').forEach(btn => {
    btn.classList.remove('bg-emerald-600', 'text-white', 'shadow-xs');
    btn.classList.add('bg-white', 'text-slate-600', 'border', 'border-slate-200');
  });

  const activeBtn = document.getElementById(`prop-filter-${filter}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-white', 'text-slate-600', 'border', 'border-slate-200');
    activeBtn.classList.add('bg-emerald-600', 'text-white', 'shadow-xs');
  }

  renderProposalsList();
}

function renderProposalsList() {
  const container = document.getElementById('proposalsListContainer');
  if (!container) return;

  if (!state.data.proposals) state.data.proposals = [];

  let list = [...state.data.proposals];

  // Filter by status
  if (state.proposalFilter && state.proposalFilter !== 'all') {
    list = list.filter(p => p.status === state.proposalFilter);
  }

  // Filter by global search
  if (state.searchQuery && state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase().trim();
    list = list.filter(p => 
      (p.proposalNo && p.proposalNo.toLowerCase().includes(q)) ||
      (p.customerName && p.customerName.toLowerCase().includes(q)) ||
      (p.customerPhone && p.customerPhone.includes(q)) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.customerDistrict && p.customerDistrict.toLowerCase().includes(q))
    );
  }

  // Sort descending by date
  list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  if (list.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
        <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <i data-lucide="file-plus-2" class="w-7 h-7"></i>
        </div>
        <p class="font-bold text-slate-800 text-sm">Fiyat teklifi bulunamadı</p>
        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Kombi değişimi, klima montajı veya büyük onarımlar için yeni bir teklif oluşturup A4 PDF olarak kaydedebilir ve WhatsApp'tan iletebilirsiniz.</p>
        <button onclick="openProposalModal()" class="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition">
          <i data-lucide="plus" class="w-4 h-4"></i> Yeni Teklif Hazırla
        </button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const statusLabels = {
    draft: { label: 'Taslak', badgeClass: 'badge-draft' },
    sent: { label: 'Gönderildi', badgeClass: 'badge-sent' },
    accepted: { label: 'Onaylandı (Kabul)', badgeClass: 'badge-accepted' },
    rejected: { label: 'Reddedildi', badgeClass: 'badge-rejected' }
  };

  container.innerHTML = list.map(p => {
    const statusObj = statusLabels[p.status] || { label: p.status, badgeClass: 'badge-draft' };
    const itemsCount = (p.items || []).length;
    const itemsSummary = (p.items || []).slice(0, 2).map(it => it.description).join(', ');
    const moreItems = itemsCount > 2 ? ` ve ${itemsCount - 2} kalem daha` : '';

    return `
      <div class="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-xs transition duration-150">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="font-mono font-extrabold text-xs px-2.5 py-1 bg-slate-900 text-white rounded-lg">
              ${p.proposalNo || 'TKF-000'}
            </span>
            <span class="badge ${statusObj.badgeClass}">${statusObj.label}</span>
            <span class="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${formatDate(p.date)}
            </span>
            <span class="text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
              ${p.validDays || 15} Gün Geçerli
            </span>
          </div>

          <div class="text-right flex items-baseline md:flex-col md:items-end justify-between">
            <span class="text-[11px] text-slate-400 font-semibold md:mb-0.5">Toplam Teklif Bedeli</span>
            <div class="font-black text-slate-900 text-lg sm:text-xl text-emerald-700">
              ${formatMoney(p.grandTotal)}
              <span class="text-[10px] font-bold text-slate-400 font-normal ml-0.5">(${p.vatType === 'dahil' ? 'KDV Dahil' : (p.vatType === 'arti20' ? '+%20 KDV' : 'KDV Hariç')})</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 py-3 text-xs">
          <div>
            <span class="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Müşteri Bilgileri</span>
            <div class="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <i data-lucide="user" class="w-3.5 h-3.5 text-slate-400"></i>
              ${escapeHtml(p.customerName)}
            </div>
            <div class="text-slate-600 font-semibold flex items-center gap-1.5 mt-0.5">
              <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400"></i>
              ${p.customerPhone}
            </div>
            ${p.customerDistrict ? `
              <div class="text-slate-500 flex items-center gap-1 mt-0.5 text-[11px]">
                <i data-lucide="map-pin" class="w-3 h-3 text-slate-400"></i>
                ${escapeHtml(p.customerDistrict)}
              </div>` : ''}
          </div>

          <div class="md:col-span-2">
            <span class="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-0.5">Teklif Konusu & Kapsam</span>
            <div class="font-bold text-slate-900 text-xs sm:text-sm">
              ${escapeHtml(p.title)}
            </div>
            <div class="text-slate-600 text-xs mt-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
              <i data-lucide="package-check" class="w-4 h-4 text-emerald-600 shrink-0"></i>
              <span class="truncate">${itemsCount} Kalem: ${escapeHtml(itemsSummary)}${moreItems}</span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div class="flex items-center gap-2">
            <button onclick="sendProposalWhatsApp('${p.id}')" class="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs active:scale-95">
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp İle Gönder
            </button>
            <button onclick="openPrintProposalModal('${p.id}')" class="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-sky-200 active:scale-95">
              <i data-lucide="printer" class="w-3.5 h-3.5"></i> Yazdır / PDF Kaydet
            </button>
          </div>

          <div class="flex items-center gap-1.5 ml-auto">
            <button onclick="openProposalModal('${p.id}')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition">
              <i data-lucide="edit-2" class="w-3.5 h-3.5"></i> Düzenle
            </button>
            <button onclick="deleteProposal('${p.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="Teklifi Sil">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function openProposalModal(proposalId = null) {
  state.editingProposalId = proposalId;

  // Populate registered customers dropdown
  const select = document.getElementById('propCustomerSelect');
  if (select) {
    let optHtml = '<option value="">-- Rehberden Müşteri Seç --</option>';
    if (state.data.customers && state.data.customers.length > 0) {
      state.data.customers.forEach(c => {
        const dist = c.district ? ` - ${c.district}` : '';
        optHtml += `<option value="${c.id}">${c.name} (${c.phone}${dist})</option>`;
      });
    }
    select.innerHTML = optHtml;
  }

  const itemsContainer = document.getElementById('proposalItemsContainer');
  if (itemsContainer) itemsContainer.innerHTML = '';

  if (proposalId) {
    // Edit mode
    const p = (state.data.proposals || []).find(item => item.id === proposalId);
    if (!p) return;

    document.getElementById('proposalModalTitle').innerHTML = `
      <i data-lucide="edit-3" class="w-5 h-5 text-emerald-400"></i> Fiyat Teklifini Düzenle (${p.proposalNo || ''})
    `;
    document.getElementById('propNo').value = p.proposalNo || '';
    document.getElementById('propDate').value = p.date || new Date().toISOString().split('T')[0];
    document.getElementById('propValidDays').value = p.validDays || 15;
    document.getElementById('propStatus').value = p.status || 'sent';
    document.getElementById('propCustomerName').value = p.customerName || '';
    document.getElementById('propCustomerPhone').value = p.customerPhone || '';
    document.getElementById('propCustomerDistrict').value = p.customerDistrict || '';
    document.getElementById('propCustomerAddress').value = p.customerAddress || '';
    document.getElementById('propTitle').value = p.title || '';
    document.getElementById('propDiscount').value = p.discount || 0;
    document.getElementById('propVatType').value = p.vatType || 'dahil';
    document.getElementById('propTerms').value = p.terms || '';

    if (p.items && p.items.length > 0) {
      p.items.forEach(it => {
        addProposalItemRow(it.description, it.qty, it.unit, it.unitPrice);
      });
    } else {
      addProposalItemRow();
    }
  } else {
    // New mode
    document.getElementById('proposalModalTitle').innerHTML = `
      <i data-lucide="file-plus-2" class="w-5 h-5 text-emerald-400"></i> Yeni Fiyat Teklifi Hazırla
    `;
    const count = (state.data.proposals || []).length + 1;
    const propNoStr = `TKF-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

    document.getElementById('propNo').value = propNoStr;
    document.getElementById('propDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('propValidDays').value = "15";
    document.getElementById('propStatus').value = "sent";
    document.getElementById('propCustomerName').value = '';
    document.getElementById('propCustomerPhone').value = '';
    document.getElementById('propCustomerDistrict').value = '';
    document.getElementById('propCustomerAddress').value = '';
    document.getElementById('propTitle').value = '';
    document.getElementById('propDiscount').value = 0;
    document.getElementById('propVatType').value = 'dahil';

    const settings = state.data.settings || {};
    document.getElementById('propTerms').value = 
      "1. Fiyatlarımıza nakliye, eski cihazın sökümü ve montaj işçiliği dahildir.\n" +
      "2. Cihaz ve montaj işçiliğimiz 1 (bir) yıl " + (settings.businessName || 'ustatamirci') + " garantisindedir.\n" +
      "3. Ödeme iş tesliminde nakit veya banka havalesi / EFT yoluyla tahsil edilir.";

    addProposalItemRow();
  }

  calcProposalTotals();
  document.getElementById('proposalModal').classList.remove('hidden');
  lucide.createIcons();
}

function fillProposalCustomerFromSelect(customerId) {
  if (!customerId) return;
  const cust = getCustomer(customerId);
  if (!cust) return;

  document.getElementById('propCustomerName').value = cust.name || '';
  document.getElementById('propCustomerPhone').value = cust.phone || '';

  let distText = cust.district || '';
  if (cust.neighborhood) distText += (distText ? ' / ' : '') + cust.neighborhood;
  if (cust.city && !distText.includes(cust.city)) distText += (distText ? ' - ' : '') + cust.city;
  document.getElementById('propCustomerDistrict').value = distText;

  document.getElementById('propCustomerAddress').value = cust.address || '';
}

function addProposalItemRow(description = '', qty = 1, unit = 'Adet', unitPrice = 0) {
  const container = document.getElementById('proposalItemsContainer');
  if (!container) return;

  const rowId = 'prop-row-' + Math.random().toString(36).substr(2, 9);
  const rowDiv = document.createElement('div');
  rowDiv.className = 'proposal-item-row flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200';
  rowDiv.id = rowId;

  rowDiv.innerHTML = `
    <div class="flex-1">
      <input type="text" class="prop-item-desc w-full border border-slate-300 rounded-xl p-2 font-medium bg-white focus:outline-none focus:border-emerald-500" placeholder="Ürün veya Hizmet Kalemi (Örn: DemirDöküm Kombi, İşçilik...)" value="${escapeHtml(description)}" required>
    </div>
    <div class="w-20">
      <input type="number" min="1" step="1" class="prop-item-qty w-full border border-slate-300 rounded-xl p-2 text-center font-bold bg-white focus:outline-none focus:border-emerald-500" value="${qty}" oninput="calcProposalTotals()">
    </div>
    <div class="w-24">
      <select class="prop-item-unit w-full border border-slate-300 rounded-xl p-2 bg-white font-medium text-slate-700">
        <option value="Adet" ${unit === 'Adet' ? 'selected' : ''}>Adet</option>
        <option value="Hizmet" ${unit === 'Hizmet' ? 'selected' : ''}>Hizmet</option>
        <option value="Set" ${unit === 'Set' ? 'selected' : ''}>Set</option>
        <option value="Metre" ${unit === 'Metre' ? 'selected' : ''}>Metre</option>
        <option value="Takım" ${unit === 'Takım' ? 'selected' : ''}>Takım</option>
      </select>
    </div>
    <div class="w-28">
      <input type="number" step="50" class="prop-item-price w-full border border-slate-300 rounded-xl p-2 text-right font-bold text-slate-800 bg-white focus:outline-none focus:border-emerald-500" placeholder="0 ₺" value="${unitPrice || ''}" oninput="calcProposalTotals()">
    </div>
    <div class="prop-item-total w-24 text-right font-black text-slate-900 pr-1">
      0 ₺
    </div>
    <button type="button" onclick="removeProposalItemRow('${rowId}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition shrink-0" title="Kalemi Sil">
      <i data-lucide="trash-2" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(rowDiv);
  calcProposalTotals();
  lucide.createIcons();
}

function removeProposalItemRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
  calcProposalTotals();
}

function calcProposalTotals() {
  const rows = document.querySelectorAll('.proposal-item-row');
  let subtotal = 0;

  rows.forEach(row => {
    const qtyInput = row.querySelector('.prop-item-qty');
    const priceInput = row.querySelector('.prop-item-price');
    const totalDisplay = row.querySelector('.prop-item-total');

    const qty = Number(qtyInput ? qtyInput.value : 0) || 0;
    const price = Number(priceInput ? priceInput.value : 0) || 0;
    const lineTotal = qty * price;

    if (totalDisplay) {
      totalDisplay.innerText = formatMoney(lineTotal);
    }
    subtotal += lineTotal;
  });

  const discountInput = document.getElementById('propDiscount');
  const vatTypeSelect = document.getElementById('propVatType');
  const subtotalDisplay = document.getElementById('propSubtotalDisplay');
  const grandTotalDisplay = document.getElementById('propGrandTotalDisplay');
  const grandTotalHidden = document.getElementById('propGrandTotal');

  const discount = Number(discountInput ? discountInput.value : 0) || 0;
  const afterDiscount = Math.max(0, subtotal - discount);

  let grandTotal = afterDiscount;
  const vatType = vatTypeSelect ? vatTypeSelect.value : 'dahil';
  if (vatType === 'arti20') {
    grandTotal = Math.round(afterDiscount * 1.20);
  }

  if (subtotalDisplay) subtotalDisplay.innerText = formatMoney(subtotal);
  if (grandTotalDisplay) grandTotalDisplay.innerText = formatMoney(grandTotal);
  if (grandTotalHidden) grandTotalHidden.value = grandTotal;
}

function saveProposalForm(e) {
  e.preventDefault();

  const proposalNo = document.getElementById('propNo').value.trim();
  const date = document.getElementById('propDate').value;
  const validDays = Number(document.getElementById('propValidDays').value) || 15;
  const status = document.getElementById('propStatus').value;
  const customerName = document.getElementById('propCustomerName').value.trim();
  const customerPhone = document.getElementById('propCustomerPhone').value.trim();
  const customerDistrict = document.getElementById('propCustomerDistrict').value.trim();
  const customerAddress = document.getElementById('propCustomerAddress').value.trim();
  const title = document.getElementById('propTitle').value.trim();
  const discount = Number(document.getElementById('propDiscount').value) || 0;
  const vatType = document.getElementById('propVatType').value;
  const terms = document.getElementById('propTerms').value.trim();

  // Collect items
  const rows = document.querySelectorAll('.proposal-item-row');
  const items = [];
  let subtotal = 0;

  rows.forEach(row => {
    const desc = row.querySelector('.prop-item-desc')?.value.trim() || '';
    const qty = Number(row.querySelector('.prop-item-qty')?.value) || 1;
    const unit = row.querySelector('.prop-item-unit')?.value || 'Adet';
    const unitPrice = Number(row.querySelector('.prop-item-price')?.value) || 0;

    if (desc) {
      items.push({ description: desc, qty, unit, unitPrice });
      subtotal += (qty * unitPrice);
    }
  });

  if (items.length === 0) {
    alert("Lütfen en az bir adet teklif kalemi ekleyiniz!");
    return;
  }

  const afterDiscount = Math.max(0, subtotal - discount);
  let grandTotal = afterDiscount;
  if (vatType === 'arti20') {
    grandTotal = Math.round(afterDiscount * 1.20);
  }

  if (!state.data.proposals) state.data.proposals = [];

  if (state.editingProposalId) {
    const idx = state.data.proposals.findIndex(p => p.id === state.editingProposalId);
    if (idx !== -1) {
      state.data.proposals[idx] = {
        ...state.data.proposals[idx],
        proposalNo,
        date,
        validDays,
        status,
        customerName,
        customerPhone,
        customerDistrict,
        customerAddress,
        title,
        items,
        subtotal,
        discount,
        vatType,
        grandTotal,
        terms
      };
    }
  } else {
    const newProp = {
      id: 'prop-' + Date.now(),
      proposalNo,
      date,
      validDays,
      status,
      customerName,
      customerPhone,
      customerDistrict,
      customerAddress,
      title,
      items,
      subtotal,
      discount,
      vatType,
      grandTotal,
      terms
    };
    state.data.proposals.unshift(newProp);
  }

  saveData();
  closeModal('proposalModal');
  renderAll();
}

function deleteProposal(id) {
  const p = (state.data.proposals || []).find(item => item.id === id);
  if (!p) return;

  if (confirm(`"${p.proposalNo} - ${p.customerName}" teklifini silmek istediğinize emin misiniz?`)) {
    state.data.proposals = state.data.proposals.filter(item => item.id !== id);
    saveData();
    renderAll();
  }
}

function openPrintProposalModal(proposalId) {
  state.printingProposalId = proposalId;
  const p = (state.data.proposals || []).find(item => item.id === proposalId);
  if (!p) return;

  const settings = state.data.settings || {};

  document.getElementById('printPropBusinessName').innerText = settings.businessName || 'ustatamirci';
  document.getElementById('printPropBusinessContact').innerText = 
    `Tel: ${settings.phone || '0532 000 00 00'} • ${settings.address || 'İstanbul'}`;

  const taxInfoEl = document.getElementById('printPropTaxInfo');
  if (taxInfoEl) {
    taxInfoEl.innerText = settings.taxInfo ? `Vergi Dairesi: ${settings.taxInfo}` : '';
  }

  document.getElementById('printPropNo').innerText = p.proposalNo || '-';
  document.getElementById('printPropDate').innerText = formatDate(p.date);

  let validStr = `${p.validDays || 15} Gün`;
  if (p.date) {
    const d = new Date(p.date);
    d.setDate(d.getDate() + Number(p.validDays || 15));
    validStr += ` (Son: ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth()+1).padStart(2, '0')}.${d.getFullYear()})`;
  }
  document.getElementById('printPropValid').innerText = validStr;

  document.getElementById('printPropCustName').innerText = p.customerName || '-';
  document.getElementById('printPropCustPhone').innerText = p.customerPhone || '-';

  let fullAddress = p.customerAddress || '';
  if (p.customerDistrict) {
    fullAddress += (fullAddress ? ' / ' : '') + p.customerDistrict;
  }
  document.getElementById('printPropCustAddress').innerText = fullAddress || '-';
  document.getElementById('printPropTitle').innerText = p.title || '-';

  // Populate line items table
  const itemsTbody = document.getElementById('printPropItemsBody');
  if (itemsTbody) {
    if (p.items && p.items.length > 0) {
      itemsTbody.innerHTML = p.items.map((item, idx) => `
        <tr>
          <td class="py-2.5 px-3 text-center text-slate-500 font-bold">${idx + 1}</td>
          <td class="py-2.5 px-3 font-semibold text-slate-900">${escapeHtml(item.description)}</td>
          <td class="py-2.5 px-3 text-center font-medium">${item.qty} ${item.unit || 'Adet'}</td>
          <td class="py-2.5 px-3 text-right font-medium">${formatMoney(item.unitPrice)}</td>
          <td class="py-2.5 px-3 text-right font-black text-slate-900">${formatMoney(item.qty * item.unitPrice)}</td>
        </tr>
      `).join('');
    } else {
      itemsTbody.innerHTML = `
        <tr><td colspan="5" class="py-4 text-center text-slate-400 italic">Kalem bilgisi bulunamadı.</td></tr>
      `;
    }
  }

  document.getElementById('printPropSubtotal').innerText = formatMoney(p.subtotal || 0);

  const discountRow = document.getElementById('printPropDiscountRow');
  const discountEl = document.getElementById('printPropDiscount');
  if (p.discount && Number(p.discount) > 0) {
    if (discountRow) discountRow.classList.remove('hidden');
    if (discountEl) discountEl.innerText = `-${formatMoney(p.discount)}`;
  } else {
    if (discountRow) discountRow.classList.add('hidden');
  }

  const vatEl = document.getElementById('printPropVat');
  if (vatEl) {
    if (p.vatType === 'dahil') vatEl.innerText = 'Dahil';
    else if (p.vatType === 'arti20') vatEl.innerText = '+%20 Dahil Edildi';
    else vatEl.innerText = 'KDV Hariç (%0)';
  }

  document.getElementById('printPropGrandTotal').innerText = formatMoney(p.grandTotal || 0);
  document.getElementById('printPropTerms').innerText = p.terms || 'Belirtilmedi.';

  document.getElementById('printProposalModal').classList.remove('hidden');
  lucide.createIcons();
}

function sendProposalWhatsApp(proposalId) {
  const p = (state.data.proposals || []).find(item => item.id === proposalId);
  if (!p) return;
  const settings = state.data.settings || {};

  if (!p.customerPhone) {
    alert("Müşteri telefon numarası bulunamadı!");
    return;
  }

  const cleanPhone = p.customerPhone.replace(/\D/g, '').replace(/^0/, '');
  if (!cleanPhone) {
    alert("Geçerli bir telefon numarası girilmemiş!");
    return;
  }

  let itemsText = '';
  if (p.items && p.items.length > 0) {
    itemsText = p.items.map((item, idx) => 
      `${idx + 1}. *${item.description}*\n   Miktar: ${item.qty} ${item.unit || 'Adet'} | Birim: ${formatMoney(item.unitPrice)} | Tutar: ${formatMoney(item.qty * item.unitPrice)}`
    ).join('\n');
  }

  let discountText = '';
  if (p.discount && Number(p.discount) > 0) {
    discountText = `\n🎁 *İskonto / İndirim:* -${formatMoney(p.discount)}`;
  }

  const vatDesc = p.vatType === 'dahil' ? 'KDV Dahil' : (p.vatType === 'arti20' ? '+%20 KDV Dahil' : 'KDV Hariç');

  const msg = `Sayın *${p.customerName}*,\n\n` +
    `*${settings.businessName || 'ustatamirci'}* tarafından hazırlanan fiyat teklifiniz aşağıda bilgilerinize sunulmuştur:\n\n` +
    `📄 *Teklif No:* ${p.proposalNo || '-'}\n` +
    `📅 *Tarih:* ${formatDate(p.date)} (Geçerlilik: ${p.validDays || 15} Gün)\n` +
    `📌 *Konu:* ${p.title}\n\n` +
    `📋 *Teklif Kalemleri:*\n${itemsText}\n\n` +
    `--------------------------\n` +
    `Ara Toplam: ${formatMoney(p.subtotal)}` +
    discountText + `\n` +
    `💰 *GENEL TOPLAM:* *${formatMoney(p.grandTotal)}* (${vatDesc})\n\n` +
    `ℹ️ *Teklif Koşulları:*\n${p.terms || 'Teklif onaylandığında montaj randevusu organize edilecektir.'}\n\n` +
    `Teklifimizi onaylamak veya sorularınız için bu mesaja yanıt verebilir ya da bizi *${settings.phone || ''}* numarasından arayabilirsiniz.\n\n` +
    `Sağlıklı ve konforlu günler dileriz!\n` +
    `*${settings.businessName || 'ustatamirci'} Teknik Servis*`;

  const waUrl = `https://wa.me/90${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, '_blank');
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setupEventListeners() {
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderServicesList();
      renderCustomersList();
      renderProposalsList();
    });
  }

  window.selectDeviceTypeHelper = function(type) {
    const brandDatalist = document.getElementById('popularBrandsList');
    if (brandDatalist && POPULAR_BRANDS[type]) {
      brandDatalist.innerHTML = POPULAR_BRANDS[type].map(b => `<option value="${b}">`).join('');
    }
  };
}

window.addEventListener('DOMContentLoaded', initApp);




