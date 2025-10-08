// Global variables
const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with actual URL
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with actual key
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Cache for options
let optionsCache = {};

// Function to fetch branches
async function fetchBranches() {
  if (optionsCache.branches) return optionsCache.branches;
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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

// Load all approved files on page load
document.addEventListener('DOMContentLoaded', async () => {
  const filesGrid = document.getElementById('files-grid');
  if (filesGrid) {
    try {
      const response = await fetch('/api/files');
      const files = await response.json();
      filesGrid.innerHTML = '';
      files.forEach(file => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h3>${file.filename}</h3>
          <p>Branch: ${file.branch} | Semester: ${file.semester} | Subject: ${file.subject} | Type: ${file.type}</p>
          <a href="${supabaseUrl}/storage/v1/object/public/pdfs/${file.branch}/${file.semester}/${file.subject}/${file.type}/${file.filename}" target="_blank">Download</a>
        `;
        filesGrid.appendChild(card);
      });
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }
});

// Upload form handling
const uploadForm = document.getElementById('upload-form');
if (uploadForm) {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
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
      const { data, error } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file);
      if (error) {
        console.error('Upload error:', error);
        alert('Upload failed');
        return;
      }
      // Insert metadata
      const { error: insertError } = await supabase
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
    alert('Upload successful, pending approval');
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
      localStorage.setItem('token', result.token);
      window.location.href = '/admin/dashboard';
    } else {
      alert('Invalid credentials');
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
    const approveBtn = document.createElement('button');
    approveBtn.textContent = 'Approve';
    approveBtn.onclick = () => approveFile(file.id);
    const rejectBtn = document.createElement('button');
    rejectBtn.textContent = 'Reject';
    rejectBtn.onclick = () => rejectFile(file.id);
    actionsCell.appendChild(approveBtn);
    actionsCell.appendChild(rejectBtn);
  });
}

async function approveFile(id) {
  const token = localStorage.getItem('token');
  await fetch(`/api/approve/${id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  loadPendingFiles();
}

async function rejectFile(id) {
  const token = localStorage.getItem('token');
  await fetch(`/api/reject/${id}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  loadPendingFiles();
}

if (document.getElementById('pending-table')) {
  loadPendingFiles();
}