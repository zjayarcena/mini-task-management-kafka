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

// Update the user dropdown with available users
async function updateUserDropdown() {
  const users = await loadUsers();
  const select = document.getElementById('userSelect');
  const currentValue = select.value;
  
  let optionsHTML = '<option value="">Select your user...</option>';
  
  users.forEach(user => {
    optionsHTML += `<option value="${user.username}">${user.username}</option>`;
  });
  
  select.innerHTML = optionsHTML;
  
  // Restore previous selection if it still exists
  const userExists = users.some(user => user.username === currentValue);
  if (userExists) {
    select.value = currentValue;
  } else if (currentValue) {
    // If the previously selected user was deleted, clear the selection
    select.value = "";
    localStorage.removeItem('username');
  }
}

// Username management
function saveUsername() {
  const username = document.getElementById('userSelect').value;
  localStorage.setItem('username', username);
  console.log('Username saved:', username);
  load(); // Reload tasks when username changes
}

async function loadUsername() {
  await updateUserDropdown();
  const savedUsername = localStorage.getItem('username') || '';
  document.getElementById('userSelect').value = savedUsername;
}

// Initialize
loadTheme();
loadUsername();

// Track previous tasks to detect new assignments and overdue changes
let previousTaskIds = new Set();
let previousOverdueTasks = new Set();
let isFirstLoad = true;

// Notification system
function showNotification(type, title, message) {
  const container = document.getElementById('notificationContainer');
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icon = type === 'new-task' ?  '📋' : type === 'overdue' ? '⚠️' : '🔔';
  
  notification.innerHTML = `
    <span class="notification-icon">${icon}</span>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
  
  // Play notification sound
  playNotificationSound();
}

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Could not play sound:', error);
  }
}

// Browser notification permission
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Show browser notification for critical alerts
function showBrowserNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon:  '⚠️',
      badge: '⚠️',
      tag: 'overdue-task',
      requireInteraction: true
    });
  }
}

// Request notification permission on page load
requestNotificationPermission();

// Load and display user's tasks
async function load() {
  const username = document.getElementById('userSelect').value.trim();
  
  console.log('Loading tasks for username:', username);
  
  if (!username) {
    // Show empty state if no username
    ["TODO", "IN_PROGRESS", "DONE", "PAST_DUE"].forEach(s => {
      const title =
        s === "TODO" ? "To Do" :  
        s === "IN_PROGRESS" ? "In Progress" :  
        s === "DONE" ? "Done" : "Past Due";
      document.getElementById(s).innerHTML = `<h3>${title}</h3><p style="text-align: center; color: var(--text-secondary); padding: 2rem;">Select a user to see tasks</p>`;
    });
    updateStats(0, 0, 0, 0);
    return;
  }

  try {
    const res = await fetch("http://127.0.0.1:5000/tasks");
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    console.log('All tasks from API:', data);

    // Filter tasks assigned to this user (case-insensitive)
    const userTasks = data.filter(t => {
      const matches = t.assigned_to && 
                     t.assigned_to.toLowerCase().trim() === username.toLowerCase().trim();
      console.log(`Task "${t.title}" assigned to "${t.assigned_to}" - matches "${username}": ${matches}`);
      return matches;
    });

    console.log(`Found ${userTasks.length} tasks for user "${username}"`);

    // Clear columns
    ["TODO", "IN_PROGRESS", "DONE", "PAST_DUE"].forEach(s => {
      const title =
        s === "TODO" ? "To Do" : 
        s === "IN_PROGRESS" ? "In Progress" : 
        s === "DONE" ? "Done" : "Past Due";
      document.getElementById(s).innerHTML = `<h3>${title}</h3>`;
    });

    if (userTasks.length === 0) {
      // Show message if no tasks found
      document.getElementById('TODO').innerHTML += `
        <p style="text-align: center; color: var(--text-secondary); padding:2rem;">
          No tasks assigned to "${username}"
        </p>`;
    }

    const now = new Date();
    const currentTaskIds = new Set();
    const currentOverdueTasks = new Set();
    let todoCount = 0, inProgressCount = 0, doneCount = 0, overdueCount = 0;

    userTasks.forEach(t => {
      currentTaskIds.add(t.id);
      
      const due = t.due_date ? new Date(t.due_date) : null;
      const isOverdue = due && due < now && t.status !== "DONE";
      
      // Check if this task just became overdue (wasn't overdue before)
      if (isOverdue) {
        currentOverdueTasks.add(t.id);
        
        // Notify if task just became overdue (not on first load, and wasn't overdue before)
        if (!isFirstLoad && !previousOverdueTasks.has(t.id)) {
          showNotification(
            'overdue',
            '⚠️ Task Past Due! ',
            `"${t.title}" is now overdue! `
          );
          
          // Also show browser notification for urgent alert
          showBrowserNotification(
            '⚠️ Task Past Due!',
            `"${t.title}" is now overdue! `
          );
          
          console.log(`Task "${t.title}" is now OVERDUE!`);
        }
      }
      
      // Check if this is a new task (not in previous load)
      const isNewTask = !isFirstLoad && !previousTaskIds.has(t.id);

      const d = document.createElement("div");
      d.className = "task";
      
      if (isNewTask) {
        d.classList.add("new-task");
        showNotification(
          'new-task',
          '📋 New Task Assigned! ',
          `"${t.title}" has been assigned to you`
        );
      }

      // Calculate time remaining for display
      let timeInfo = '';
      if (due) {
        const timeDiff = due - now;
        const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysLeft = Math.floor(hoursLeft / 24);
        
        if (isOverdue) {
          const hoursOverdue = Math.abs(hoursLeft);
          const daysOverdue = Math.abs(daysLeft);
          if (daysOverdue > 0) {
            timeInfo = `<span style="color: var(--danger); font-weight: 600;">⚠️ ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue</span>`;
          } else {
            timeInfo = `<span style="color: var(--danger); font-weight: 600;">⚠️ ${hoursOverdue} hour${hoursOverdue > 1 ? 's' : ''} overdue</span>`;
          }
        } else if (hoursLeft < 24) {
          timeInfo = `<span style="color: var(--warning); font-weight: 600;">⏰ Due in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}</span>`;
        } else if (daysLeft <= 3) {
          timeInfo = `<span style="color: var(--warning);">⏰ Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}</span>`;
        }
      }

      d.innerHTML = `
        <div class="task-title">${t.title}</div>
        <div class="task-meta">
          ${t.due_date ? '📅 ' + new Date(t.due_date).toLocaleString() : ''}
          ${timeInfo ? '<br>' + timeInfo : ''}
        </div>
        <div class="task-actions">
          ${t.status === 'TODO' ?  
            `<button onclick="move(${t.id},'IN_PROGRESS')">▶ Start</button>` : ''}
          ${t.status === 'IN_PROGRESS' ?  
            `<button class="complete-btn" onclick="move(${t.id},'DONE')">✓ Complete</button>` : ''}
        </div>
      `;

      if (isOverdue) {
        d.classList.add("overdue");
        document.getElementById("PAST_DUE").appendChild(d);
        overdueCount++;
        
        // Show overdue notification on first load (page refresh)
        if (isFirstLoad) {
          showNotification(
            'overdue',
            '⚠️ Overdue Task',
            `"${t.title}" is past due`
          );
        }
      } else {
        document.getElementById(t.status).appendChild(d);
        if (t.status === 'TODO') todoCount++;
        if (t.status === 'IN_PROGRESS') inProgressCount++;
        if (t.status === 'DONE') doneCount++;
      }
    });

    // Update stats
    updateStats(todoCount, inProgressCount, doneCount, overdueCount);

    // Update previous tasks tracking
    previousTaskIds = currentTaskIds;
    previousOverdueTasks = currentOverdueTasks;
    isFirstLoad = false;

  } catch (error) {
    console.error('Error loading tasks:', error);
    document.getElementById('TODO').innerHTML += `
      <p style="text-align: center; color: var(--danger); padding:2rem;">
        ❌ Error loading tasks<br>
        <small>${error.message}</small><br>
        <small>Make sure the backend server is running on http://127.0.0.1:5000</small>
      </p>`;
  }
}

function updateStats(todo, inProgress, done, overdue) {
  document.getElementById('todoCount').textContent = todo;
  document.getElementById('inProgressCount').textContent = inProgress;
  document.getElementById('doneCount').textContent = done;
  document.getElementById('overdueCount').textContent = overdue;
}

async function move(id, status) {
  try {
    await fetch("http://127.0.0.1:5000/tasks/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    
    // Show success notification
    const actionText = status === 'IN_PROGRESS' ? 'started' : 'completed';
    showNotification(
      'new-task',
      '✓ Task Updated!',
      `Task ${actionText} successfully`
    );
    
    load();
  } catch (error) {
    console.error('Error updating task:', error);
  }
}

// Reload tasks every 3 seconds
setInterval(load, 3000);

// Initial load
load();