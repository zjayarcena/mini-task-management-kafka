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

// Load theme immediately
loadTheme();

async function load(){
  const res = await fetch("http://127.0.0.1:5000/tasks");
  const data = await res.json();

  ["TODO","IN_PROGRESS","DONE"].forEach(s=>{
    const title = s === "TODO" ? "To Do" : s === "IN_PROGRESS" ? "In Progress" : "Done";
    document.getElementById(s).innerHTML=`<h3>${title}</h3>`;
  });

  data.forEach(t=>{
    const d=document.createElement("div");
    d.className="task";
    d.innerHTML = `
      <div class="task-title">${t.title}</div>
      <div class="task-meta">${t.assigned_to || 'Unassigned'} ${t.due_date ? '• ' + t.due_date : ''}</div>
      <div class="task-actions">
        ${t.status !== 'DONE' ?  `<button onclick="move(${t.id},'${t.status === 'TODO' ? 'IN_PROGRESS' : 'DONE'}')">${t.status === 'TODO' ? 'Start' : 'Complete'}</button>` : ''}
      </div>
    `;
    document.getElementById(t.status).appendChild(d);
  });
}

async function addTask(){
  if(! title.value) return;
  await fetch("http://127.0.0.1:5000/tasks",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      title:title.value,
      assigned_to:user.value,
      due_date:due.value
    })
  });
  title.value = '';
  user.value = '';
  due.value = '';
  load();
}

async function move(id,status){
  await fetch("http://127.0.0.1:5000/tasks/"+id,{
    method:"PUT",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({status})
  });
  load();
}

setInterval(load,1000);