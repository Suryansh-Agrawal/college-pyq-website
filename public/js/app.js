// Global variables
let supabaseClient;
let supabaseUrl;

async function initSupabase() {
  if (typeof supabase === 'undefined') {
    console.error('Supabase CDN not loaded');
    return;
  }
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    supabaseUrl = config.supabaseUrl;
    const { createClient } = supabase;
    supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
}

// Cache for navigation
let navCache = {};

// Function to fetch branches
async function fetchBranches() {
  if (optionsCache.branches) return optionsCache.branches;
  const { data, error } = await supabaseClient
    .from('files')
    .select('branch')
    .eq('status', 'approved')
    .order('branch');
  if (error) throw error;
  const branches = [...new Set(data.map(item => item.branch))];
  optionsCache.branches = branches;
  return branches;
}

// Function to fetch semesters for a branch
async function fetchSemesters(branch) {
  const cacheKey = `semesters_${branch}`;
  if (optionsCache[cacheKey]) return optionsCache[cacheKey];
  const { data, error } = await supabaseClient
    .from('files')
    .select('semester')
    .eq('branch', branch)
    .eq('status', 'approved')
    .order('semester');
  if (error) throw error;
  const semesters = [...new Set(data.map(item => item.semester))];
  optionsCache[cacheKey] = semesters;
  return semesters;
}

// Function to fetch subjects for branch and semester
async function fetchSubjects(branch, semester) {
  const cacheKey = `subjects_${branch}_${semester}`;
  if (optionsCache[cacheKey]) return optionsCache[cacheKey];
  const { data, error } = await supabaseClient
    .from('files')
    .select('subject')
    .eq('branch', branch)
    .eq('semester', semester)
    .eq('status', 'approved')
    .order('subject');
  if (error) throw error;
  const subjects = [...new Set(data.map(item => item.subject))];
  optionsCache[cacheKey] = subjects;
  return subjects;
}

// Function to fetch resource types for branch, semester, subject
async function fetchTypes(branch, semester, subject) {
  const cacheKey = `types_${branch}_${semester}_${subject}`;
  if (optionsCache[cacheKey]) return optionsCache[cacheKey];
  const { data, error } = await supabaseClient
    .from('files')
    .select('type')
    .eq('branch', branch)
    .eq('semester', semester)
    .eq('subject', subject)
    .eq('status', 'approved')
    .order('type');
  if (error) throw error;
  const types = [...new Set(data.map(item => item.type))];
  optionsCache[cacheKey] = types;
  return types;
}

// Function to fetch files for download
async function fetchFiles(branch, semester, subject, type) {
  const { data, error } = await supabaseClient
    .from('files')
    .select('*')
    .eq('branch', branch)
    .eq('semester', semester)
    .eq('subject', subject)
    .eq('type', type)
    .eq('status', 'approved');
  if (error) throw error;
  return data;
}

// Function to populate select options
function populateSelect(selectElement, options) {
  selectElement.innerHTML = '<option value="">Select...</option>';
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    selectElement.appendChild(opt);
  });
}

// Hierarchical navigation
let navStack = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initSupabase();
  if (document.getElementById('files-grid')) {
    loadBranches();
  }
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', goBack);
  }
});

async function loadBranches() {
  if (navCache.branches) {
    renderCards(navCache.branches, 'branch');
    return;
  }
  try {
    const response = await fetch('/api/branches');
    const branches = await response.json();
    navCache.branches = branches;
    renderCards(branches, 'branch');
  } catch (error) {
    console.error('Error fetching branches:', error);
  }
}

async function loadSemesters(branch) {
  const key = `semesters_${branch}`;
  if (navCache[key]) {
    renderCards(navCache[key], 'semester', branch);
    return;
  }
  try {
    const response = await fetch(`/api/semesters?branch=${branch}`);
    const semesters = await response.json();
    navCache[key] = semesters;
    renderCards(semesters, 'semester', branch);
  } catch (error) {
    console.error('Error fetching semesters:', error);
  }
}

async function loadSubjects(branch, semester) {
  const key = `subjects_${branch}_${semester}`;
  if (navCache[key]) {
    renderCards(navCache[key], 'subject', branch, semester);
    return;
  }
  try {
    const response = await fetch(`/api/subjects?branch=${branch}&semester=${semester}`);
    const subjects = await response.json();
    navCache[key] = subjects;
    renderCards(subjects, 'subject', branch, semester);
  } catch (error) {
    console.error('Error fetching subjects:', error);
  }
}

async function loadTypes(branch, semester, subject) {
  const key = `types_${branch}_${semester}_${subject}`;
  if (navCache[key]) {
    renderCards(navCache[key], 'type', branch, semester, subject);
    return;
  }
  try {
    const response = await fetch(`/api/types?branch=${branch}&semester=${semester}&subject=${subject}`);
    const types = await response.json();
    navCache[key] = types;
    renderCards(types, 'type', branch, semester, subject);
  } catch (error) {
    console.error('Error fetching types:', error);
  }
}

async function loadFiles(branch, semester, subject, type) {
  if (!navCache.allFiles) {
    try {
      const response = await fetch('/api/files');
      navCache.allFiles = await response.json();
    } catch (error) {
      console.error('Error fetching files:', error);
      return;
    }
  }
  const files = navCache.allFiles.filter(f => f.branch === branch && f.semester === semester && f.subject === subject && f.type === type);
  renderFileCards(files);
}

function renderCards(items, level, ...params) {
  const grid = document.getElementById('files-grid');
  grid.innerHTML = '';
  if (items.length === 0) {
    grid.innerHTML = '<div class="loading">No items available</div>';
  } else {
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h3>${item}</h3>`;
      card.onclick = () => navigate(level, item, ...params);
      grid.appendChild(card);
    });
  }
  document.getElementById('back-btn').style.display = navStack.length > 0 ? 'block' : 'none';
}

function renderFileCards(files) {
  const grid = document.getElementById('files-grid');
  grid.innerHTML = '';
  files.forEach(file => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${file.filename}</h3>
      <a href="${supabaseUrl}/storage/v1/object/public/pdfs/${file.branch}/${file.semester}/${file.subject}/${file.type}/${file.filename}" target="_blank">Download</a>
    `;
    grid.appendChild(card);
  });
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.style.display = navStack.length > 0 ? 'block' : 'none';
  }
}

function navigate(level, item, ...params) {
  navStack.push({ level, item, params });
  if (level === 'branch') {
    loadSemesters(item);
  } else if (level === 'semester') {
    loadSubjects(params[0], item);
  } else if (level === 'subject') {
    loadTypes(params[0], params[1], item);
  } else if (level === 'type') {
    loadFiles(params[0], params[1], params[2], item);
  }
}

function goBack() {
  if (navStack.length > 0) {
    navStack.pop();
    if (navStack.length === 0) {
      loadBranches();
    } else {
      const last = navStack[navStack.length - 1];
      if (last.level === 'branch') {
        loadSemesters(last.item);
      } else if (last.level === 'semester') {
        loadSubjects(last.params[0], last.item);
      } else if (last.level === 'subject') {
        loadTypes(last.params[0], last.params[1], last.item);
      }
    }
  }
}

// Upload form handling
const uploadForm = document.getElementById('upload-form');
if (uploadForm) {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await initSupabase();
    if (!supabaseClient) {
      alert('Failed to initialize Supabase. Please check your connection.');
      return;
    }
    const formData = new FormData(uploadForm);
    const files = formData.getAll('files');
    const branch = formData.get('branch');
    const semester = formData.get('semester');
    const subject = formData.get('subject');
    const type = formData.get('type');

    for (const file of files) {
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        return;
      }
      const filePath = `${branch}/${semester}/${subject}/${type}/${file.name}`;
      const { data, error } = await supabaseClient.storage
        .from('pdfs')
        .upload(filePath, file);
      if (error) {
        console.error('Upload error:', error);
        alert('Upload failed');
        return;
      }
      // Insert metadata
      const { error: insertError } = await supabaseClient
        .from('files')
        .insert({
          filename: file.name,
          branch,
          semester,
          subject,
          type,
          status: 'pending',
          upload_date: new Date().toISOString()
        });
      if (insertError) {
        console.error('Insert error:', insertError);
        alert('Metadata insert failed');
        return;
      }
    }
    alert('Files uploaded successfully. Admin will review them.');
    uploadForm.reset();
  });
}

// Admin login
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    // This should be handled server-side for security
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json();
    if (result.token) {
      alert('Login successful');
      localStorage.setItem('token', result.token);
      window.location.href = '/admin.html';
    } else {
      alert('Incorrect username or password');
    }
  });
}

// Admin dashboard
async function loadPendingFiles() {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/pending', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const files = await response.json();
  const table = document.getElementById('pending-table');
  table.innerHTML = '<tr><th>Filename</th><th>Branch</th><th>Semester</th><th>Subject</th><th>Type</th><th>Actions</th></tr>';
  files.forEach(file => {
    const row = table.insertRow();
    row.insertCell(0).textContent = file.filename;
    row.insertCell(1).textContent = file.branch;
    row.insertCell(2).textContent = file.semester;
    row.insertCell(3).textContent = file.subject;
    row.insertCell(4).textContent = file.type;
    const actionsCell = row.insertCell(5);
    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'View';
    viewBtn.onclick = () => window.open(`${supabaseUrl}/storage/v1/object/public/pdfs/${file.branch}/${file.semester}/${file.subject}/${file.type}/${file.filename}`, '_blank');
    const approveBtn = document.createElement('button');
    approveBtn.textContent = 'Approve';
    approveBtn.onclick = () => approveFile(file.id);
    const rejectBtn = document.createElement('button');
    rejectBtn.textContent = 'Delete';
    rejectBtn.onclick = () => rejectFile(file.id);
    actionsCell.appendChild(viewBtn);
    actionsCell.appendChild(approveBtn);
    actionsCell.appendChild(rejectBtn);
  });
}

async function approveFile(id) {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/approve/${id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (response.ok) {
    alert('File approved successfully');
  } else {
    alert('Failed to approve file');
  }
  loadPendingFiles();
}

async function rejectFile(id) {
  if (!confirm('Are you sure you want to reject this file?')) return;
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/reject/${id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (response.ok) {
    alert('File rejected successfully');
  } else {
    alert('Failed to reject file');
  }
  loadPendingFiles();
}

// Check if logged in
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  if (token && loginSection && dashboardSection) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadPendingFiles();
    loadApprovedFiles();
  }
});

async function loadApprovedFiles() {
  const response = await fetch('/api/files');
  const files = await response.json();
  const grid = document.getElementById('approved-files-grid');
  grid.innerHTML = '';
  files.forEach(file => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${file.filename}</h3>
      <p>Branch: ${file.branch} | Semester: ${file.semester} | Subject: ${file.subject} | Type: ${file.type}</p>
      <button onclick="moveFile('${file.id}', '${file.type}')">Move</button>
      <button onclick="deleteFile('${file.id}')">Delete</button>
    `;
    grid.appendChild(card);
  });
}

async function moveFile(id, currentType) {
  const newType = prompt(`Current type: ${currentType}. Enter new type (PYQ, CT, Notes):`);
  if (!newType || !['PYQ', 'CT', 'Notes'].includes(newType)) {
    alert('Invalid type');
    return;
  }
  if (newType === currentType) {
    alert('Same type');
    return;
  }
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/move/${id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ newType })
  });
  if (response.ok) {
    alert('File moved successfully');
    loadApprovedFiles();
  } else {
    alert('Failed to move file');
  }
}

async function deleteFile(id) {
  if (!confirm('Are you sure you want to delete this file?')) return;
  const token = localStorage.getItem('token');
  // Delete from DB and storage via API
  const response = await fetch(`/api/reject/${id}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
  if (response.ok) {
    alert('File deleted successfully');
    loadApprovedFiles();
  } else {
    alert('Failed to delete file');
  }
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', logoutAdmin);
}

async function logoutAdmin() {
  try {
    // Clear caches
    navCache = {};
    // Clear session
    localStorage.removeItem('token');
    // Redirect to login
    window.location.href = '/admin.html';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed');
  }
}