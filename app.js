'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const form = byId('task-form');
  const title = byId('task-title');
  const description = byId('task-description');
  const submit = byId('task-submit');
  const cancel = byId('cancel-edit');
  const list = byId('task-list');
  const status = byId('status-message');
  const refresh = byId('refresh-tasks');
  const panel = document.querySelector('.list-panel');
  let config;
  let tasks = [];
  let editingId = null;
  let filter = 'all';
  let busy = false;
  let loaded = false;

  function message(text = '', error = false) {
    status.textContent = text;
    status.classList.toggle('error', error);
    status.setAttribute('role', error ? 'alert' : 'status');
  }

  function setBusy(value) {
    busy = value;
    panel.setAttribute('aria-busy', String(value));
    form.querySelectorAll('input, textarea, button').forEach(control => {
      control.disabled = value || !config;
    });
    refresh.disabled = value || !config;
    list.querySelectorAll('button').forEach(button => { button.disabled = value; });
  }

  async function request(path = '', options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/${encodeURIComponent(config.tableName)}${path}`, {
        ...options,
        headers: { apikey: config.supabasePublishableKey, 'Content-Type': 'application/json',
          Prefer: 'return=representation', ...options.headers },
        signal: controller.signal,
        cache: 'no-store'
      });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }
      if (!response.ok) throw new Error(data?.message || `Request failed (HTTP ${response.status}).`);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The request timed out. Check your connection and try again.');
      throw error;
    } finally { clearTimeout(timeout); }
  }

  function finishEditing() {
    editingId = null;
    form.reset();
    byId('form-heading').textContent = 'Add a task';
    submit.textContent = 'Add task ↗';
    cancel.hidden = true;
  }

  function makeButton(className, label, task, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.setAttribute('aria-label', `${label}: ${task.title}`);
    button.disabled = busy;
    button.addEventListener('click', action);
    return button;
  }

  function render() {
    const search = byId('task-search').value.trim().toLocaleLowerCase();
    const visible = tasks.filter(task =>
      (filter === 'all' || (filter === 'completed' ? task.completed : !task.completed)) &&
      `${task.title} ${task.description || ''}`.toLocaleLowerCase().includes(search));
    list.replaceChildren();
    for (const task of visible) {
      const item = document.createElement('li');
      item.className = `task-item${task.completed ? ' is-complete' : ''}`;
      item.dataset.id = String(task.id);
      const content = document.createElement('div');
      content.className = 'task-content';
      const heading = document.createElement('h3');
      heading.className = 'task-title';
      heading.textContent = task.title;
      const details = document.createElement('p');
      details.className = 'task-description';
      details.textContent = task.description || 'No description';
      const state = document.createElement('span');
      state.className = 'task-status';
      state.textContent = task.completed ? 'Completed' : 'In progress';
      content.append(state, heading, details);
      const actions = document.createElement('div');
      actions.className = 'task-actions';
      const toggle = makeButton('toggle-task', task.completed ? 'Mark active' : 'Complete', task,
        () => mutate(task, 'PATCH', { completed: !task.completed }, task.completed ? 'Task marked active.' : 'Task completed.'));
      toggle.setAttribute('aria-pressed', String(task.completed));
      actions.append(toggle,
        makeButton('edit-task', 'Edit', task, () => {
          if (busy) return;
          editingId = task.id;
          title.value = task.title;
          description.value = task.description || '';
          byId('form-heading').textContent = 'Edit task';
          submit.textContent = 'Save changes ↗';
          cancel.hidden = false;
          message('Editing task. Save your changes or cancel.');
          title.focus();
        }),
        makeButton('delete-task', 'Delete', task, () => {
          if (!busy && window.confirm(`Delete “${task.title}”? This cannot be undone.`)) {
            mutate(task, 'DELETE', undefined, 'Task deleted.');
          }
        }));
      item.append(content, actions);
      list.append(item);
    }
    const completed = tasks.filter(task => task.completed).length;
    byId('total-count').textContent = String(tasks.length);
    byId('completed-count').textContent = String(completed);
    byId('task-progress').max = tasks.length || 1;
    byId('task-progress').value = completed;
    byId('empty-state').hidden = visible.length > 0;
    if (loaded) {
      byId('empty-title').textContent = tasks.length ? 'No matching tasks' : 'A fresh start';
      byId('empty-description').textContent = tasks.length ? 'Try another search or filter.' : 'Add your first task and take the next step.';
      byId('visible-count').textContent = `${visible.length} of ${tasks.length} tasks`;
    }
  }

  function assertRows(data) {
    if (!Array.isArray(data)) throw new Error('The database returned an unexpected response.');
    for (const task of data) {
      if (task.id == null || typeof task.title !== 'string' || typeof task.completed !== 'boolean') {
        throw new Error('The tasks table does not match the expected schema.');
      }
    }
    return data;
  }

  async function loadTasks() {
    if (busy || !config) return;
    setBusy(true);
    message('Loading tasks…');
    try {
      tasks = assertRows(await request('?select=id,title,description,completed&order=id.desc'));
      loaded = true;
      render();
      message();
    } catch (error) {
      message(`Could not load tasks: ${error.message}`, true);
      if (!loaded) {
        byId('empty-title').textContent = 'Could not load your tasks';
        byId('empty-description').textContent = 'Check the status message above, then choose Refresh.';
      }
    } finally { setBusy(false); }
  }

  async function mutate(task, method, body, success) {
    if (busy) return;
    setBusy(true);
    message('Saving changes…');
    try {
      const rows = assertRows(await request(`?id=eq.${encodeURIComponent(task.id)}`, {
        method, body: body === undefined ? undefined : JSON.stringify(body)
      }));
      if (rows.length !== 1) throw new Error('This task changed or is no longer available. Refresh and try again.');
      if (method === 'DELETE') {
        tasks = tasks.filter(row => row.id !== task.id);
        if (editingId === task.id) finishEditing();
      } else {
        tasks = tasks.map(row => row.id === task.id ? rows[0] : row);
      }
      render();
      message(success);
    } catch (error) { message(`Could not save changes: ${error.message}`, true); }
    finally { setBusy(false); }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !config) return;
    const cleanTitle = title.value.trim();
    if (!cleanTitle) { message('Please enter a task title.', true); title.focus(); return; }
    const body = { title: cleanTitle, description: description.value.trim() || null };
    const id = editingId;
    setBusy(true);
    message('Saving task…');
    let saved = false;
    try {
      const rows = assertRows(await request(id === null ? '' : `?id=eq.${encodeURIComponent(id)}`, {
        method: id === null ? 'POST' : 'PATCH', body: JSON.stringify(body)
      }));
      if (rows.length !== 1) throw new Error('The task was not returned by the database. Refresh before trying again.');
      if (id === null) tasks.unshift(rows[0]);
      else tasks = tasks.map(task => task.id === id ? rows[0] : task);
      finishEditing();
      loaded = true;
      render();
      message(id === null ? 'Task added.' : 'Task updated.');
      saved = true;
    } catch (error) { message(`Could not save task: ${error.message}`, true); }
    finally { setBusy(false); if (saved) title.focus(); }
  });
  cancel.addEventListener('click', () => { finishEditing(); message(); title.focus(); });
  refresh.addEventListener('click', loadTasks);
  byId('task-search').addEventListener('input', render);
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    render();
  }));

  async function init() {
    try {
      const response = await fetch('config.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Cannot read config.json (HTTP ${response.status}).`);
      const candidate = await response.json();
      let url;
      try { url = new URL(candidate.supabaseUrl); } catch { throw new Error('Set the Supabase project URL in config.json.'); }
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
        throw new Error('Use your HTTPS Supabase project URL in config.json.');
      }
      if (typeof candidate.supabasePublishableKey !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(candidate.supabasePublishableKey)) {
        throw new Error('Set a publishable key (sb_publishable_...) in config.json. Secret and service_role keys are not allowed.');
      }
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(candidate.tableName || '')) throw new Error('Invalid tableName in config.json.');
      config = { ...candidate, supabaseUrl: url.origin };
      await loadTasks();
    } catch (error) {
      message(`Setup needed: ${error.message}`, true);
      byId('empty-title').textContent = 'Connect your workspace';
      byId('empty-description').textContent = 'Follow the Supabase setup steps in README.md.';
      setBusy(false);
    }
  }
  init();
})();
