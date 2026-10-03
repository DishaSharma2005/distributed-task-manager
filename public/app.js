/**
 * Frontend JavaScript for Distributed Task Manager
 * Communicates with the Express REST API via fetch().
 * No frameworks — pure vanilla JS.
 */

const API = {
  tasks:    '/api/tasks',
  instance: '/api/instance'
};

// ─── DOM References ───────────────────────────────────────
const taskForm        = document.getElementById('task-form');
const titleInput      = document.getElementById('task-title');
const descInput       = document.getElementById('task-description');
const taskList        = document.getElementById('task-list');
const taskCount       = document.getElementById('task-count');
const tasksLoading    = document.getElementById('tasks-loading');
const tasksEmpty      = document.getElementById('tasks-empty');
const formError       = document.getElementById('form-error');
const instanceLabel   = document.getElementById('instance-label');
const serverInstance  = document.getElementById('server-instance');
const serverHostname  = document.getElementById('server-hostname');
const badgeDot        = document.getElementById('badge-dot');
const toast           = document.getElementById('toast');

let toastTimer = null;

// ─── Toast Notifications ──────────────────────────────────
function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast hidden'; }, 3000);
}

// ─── Fetch Instance Info ──────────────────────────────────
async function loadInstanceInfo() {
  try {
    const res  = await fetch(API.instance);
    const data = await res.json();

    instanceLabel.textContent  = data.instance;
    serverInstance.textContent = data.instance;
    serverHostname.textContent = data.hostname;

    // Visual confirmation that connection is established
    badgeDot.style.background = '#34d399';
  } catch {
    instanceLabel.textContent  = 'Unknown';
    serverInstance.textContent = 'Unavailable';
    badgeDot.style.background  = '#f87171';
  }
}

// ─── Task Helpers ─────────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function buildTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.completed ? ' completed' : ''}`;
  li.dataset.id = task._id;
  li.setAttribute('role', 'listitem');

  li.innerHTML = `
    <div class="task-checkbox">${task.completed ? '✓' : ''}</div>
    <div class="task-body">
      <div class="task-title">${escapeHtml(task.title)}</div>
      ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
      <div class="task-meta">Created ${formatDate(task.createdAt)}</div>
    </div>
    <div class="task-actions">
      ${task.completed
        ? `<button class="btn btn-completed" disabled>✓ Done</button>`
        : `<button class="btn btn-success complete-btn" data-id="${task._id}" aria-label="Mark complete">✓ Complete</button>`
      }
      <button class="btn btn-danger delete-btn" data-id="${task._id}" aria-label="Delete task">🗑 Delete</button>
    </div>
  `;

  return li;
}

// Simple HTML escape to prevent XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Load All Tasks ───────────────────────────────────────
async function loadTasks() {
  tasksLoading.classList.remove('hidden');
  tasksEmpty.classList.add('hidden');
  taskList.innerHTML = '';

  try {
    const res   = await fetch(API.tasks);
    const tasks = await res.json();

    tasksLoading.classList.add('hidden');

    if (!tasks.length) {
      tasksEmpty.classList.remove('hidden');
      taskCount.textContent = '0';
      return;
    }

    taskCount.textContent = tasks.length;
    tasks.forEach(task => taskList.appendChild(buildTaskElement(task)));
  } catch {
    tasksLoading.classList.add('hidden');
    showToast('Failed to load tasks. Is the server running?', 'error');
  }
}

// ─── Create Task ──────────────────────────────────────────
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('hidden');

  const title       = titleInput.value.trim();
  const description = descInput.value.trim();

  if (!title) {
    formError.textContent = 'Please enter a task title.';
    formError.classList.remove('hidden');
    titleInput.focus();
    return;
  }

  const createBtn = document.getElementById('create-btn');
  createBtn.disabled = true;
  createBtn.textContent = 'Creating…';

  try {
    const res = await fetch(API.tasks, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, description })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create task');
    }

    titleInput.value = '';
    descInput.value  = '';
    showToast('Task created successfully!', 'success');
    await loadTasks();
  } catch (err) {
    formError.textContent = err.message;
    formError.classList.remove('hidden');
  } finally {
    createBtn.disabled   = false;
    createBtn.innerHTML  = '<span class="btn-icon">➕</span> Add Task';
  }
});

// ─── Complete / Delete (event delegation) ────────────────
taskList.addEventListener('click', async (e) => {
  const completeBtn = e.target.closest('.complete-btn');
  const deleteBtn   = e.target.closest('.delete-btn');

  if (completeBtn) {
    const id = completeBtn.dataset.id;
    completeBtn.disabled    = true;
    completeBtn.textContent = 'Saving…';
    try {
      await fetch(`${API.tasks}/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ completed: true })
      });
      showToast('Task marked as complete!', 'success');
      await loadTasks();
    } catch {
      showToast('Failed to update task.', 'error');
      completeBtn.disabled    = false;
      completeBtn.textContent = '✓ Complete';
    }
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    if (!confirm('Delete this task?')) return;
    deleteBtn.disabled    = true;
    deleteBtn.textContent = 'Deleting…';
    try {
      await fetch(`${API.tasks}/${id}`, { method: 'DELETE' });
      showToast('Task deleted.', 'success');
      await loadTasks();
    } catch {
      showToast('Failed to delete task.', 'error');
      deleteBtn.disabled    = false;
      deleteBtn.textContent = '🗑 Delete';
    }
  }
});

// ─── Initial Load ─────────────────────────────────────────
(async () => {
  await loadInstanceInfo();
  await loadTasks();
})();
