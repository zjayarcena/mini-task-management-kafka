// Theme toggle functionality
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Load saved theme on page load
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.getElementById('themeToggle').checked = savedTheme === 'dark';
}
loadTheme();

// User Management - Using API
async function loadUsers() {
  try {
    const res = await fetch("http://127.0.0.1:5000/users");
    const users = await res.json();
    return users;
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

async function addUser() {
  const input = document.getElementById('newUserInput');
  const username = input.value.trim();
  
  if (!username) {
    alert('Please enter a username');
    return;
  }
  
  try {
    const response = await fetch("http://127.0.0.1:5000/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username })
    });
    
    if (response.ok) {
      input.value = '';
      await updateUserSelect();
      await renderUsersList();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to add user');
    }
  } catch (error) {
    console.error('Error adding user:', error);
    alert('Failed to add user');
  }
}

async function deleteUser(userId, username) {
  if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`http://127.0.0.1:5000/users/${userId}`, {
      method: "DELETE"
    });
    
    if (response.ok) {
      await updateUserSelect();
      await renderUsersList();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to delete user');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    alert('Failed to delete user');
  }
}

async function renderUsersList() {
  const users = await loadUsers();
  const container = document.getElementById('usersList');
  
  if (users.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No users yet. Add your first user above. </p>';
    return;
  }
  
  container.innerHTML = users.map(user => `
    <div class="user-item">
      <div class="user-item-info">
        <div class="user-avatar">👤</div>
        <span class="user-name">${user.username}</span>
      </div>
      <button class="delete-user-btn" onclick="deleteUser(${user.id}, '${user.username}')">Delete</button>
    </div>
  `).join('');
}

async function updateUserSelect() {
  const users = await loadUsers();
  const select = document.getElementById('userSelect');
  const currentValue = select.value;
  
  select.innerHTML = '<option value="">Select user...</option>' + 
    users.map(user => `<option value="${user.username}">${user.username}</option>`).join('');
  
  // Restore previous selection if it still exists
  const userExists = users.some(user => user.username === currentValue);
  if (userExists) {
    select.value = currentValue;
  }
}

function toggleUserManager() {
  const modal = document.getElementById('userManagerModal');
  modal.classList.toggle('active');
  renderUsersList();
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('userManagerModal');
  if (event.target === modal) {
    modal.classList.remove('active');
  }
}

// Initialize users on load
updateUserSelect();

// Task Management
async function load() {
  try {
    const res = await fetch("http://127.0.0.1:5000/tasks");
    const data = await res.json();

    ["TODO","IN_PROGRESS","DONE","PAST_DUE"].forEach(s => {
      const title =
        s === "TODO" ? "To Do" :
        s === "IN_PROGRESS" ? "In Progress" :
        s === "DONE" ? "Done" :  "Past Due";
      document.getElementById(s).innerHTML = `<h3>${title}</h3>`;
    });

    const now = new Date();

    data.forEach(t => {
      const d = document.createElement("div");
      d.className = "task";

      const due = t.due_date ? new Date(t.due_date) : null;
      const isOverdue = due && due < now && t.status !== "DONE";

      d.innerHTML = `
        <div class="task-title">${t.title}</div>
        <div class="task-meta">
          ${t.assigned_to ? `<span class="task-assigned">👤 ${t.assigned_to}</span>` : '<span style="color: var(--text-secondary);">Unassigned</span>'}
          ${t.due_date ?  '📅 ' + new Date(t.due_date).toLocaleString() : ''}
        </div>
        <div class="task-actions">
          ${t.status !== 'DONE' ? `<button onclick="move(${t.id},'${t.status === 'TODO' ? 'IN_PROGRESS' : 'DONE'}')">
            ${t.status === 'TODO' ?  '▶ Start' : '✓ Complete'}
          </button>` : ''}
          <button class="delete-task-btn" onclick="deleteTask(${t.id})">🗑 Delete</button>
        </div>
      `;

      if (isOverdue) {
        d.classList.add("overdue");
        document.getElementById("PAST_DUE").appendChild(d);
      } else {
        document.getElementById(t.status).appendChild(d);
      }
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
}

async function addTask() {
  const title = document.getElementById('title').value;
  const user = document.getElementById('userSelect').value;
  const due = document.getElementById('due').value;

  if (!title || !due) {
    alert('Please fill in task title and due date');
    return;
  }

  if (! user) {
    alert('Please select a user to assign the task');
    return;
  }

  try {
    await fetch("http://127.0.0.1:5000/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        assigned_to:  user,
        due_date:  due
      })
    });
    
    document.getElementById('title').value = '';
    document.getElementById('userSelect').value = '';
    document.getElementById('due').value = '';
    load();
  } catch (error) {
    console.error('Error adding task:', error);
    alert('Failed to add task');
  }
}

async function move(id, status) {
  try {
    await fetch("http://127.0.0.1:5000/tasks/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    load();
  } catch (error) {
    console.error('Error updating task:', error);
  }
}

async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) {
    return;
  }
  
  try {
    await fetch("http://127.0.0.1:5000/tasks/" + id, {
      method: "DELETE"
    });
    load();
  } catch (error) {
    console.error('Error deleting task:', error);
  }
}

setInterval(load, 1000);
load();