/**
 * GroupDraw — Smart Presentation Lottery
 * Main application logic (premium lottery animation edition)
 */

(function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────
  let state = loadData();
  let currentView = 'dashboard';
  let lotteryState = null; // holds pre-computed draw + animation state

  // ─── DOM refs ────────────────────────────────────────────
  const main = document.getElementById('main-content');
  const pageTitle = document.getElementById('page-title');
  const sidebar = document.getElementById('sidebar');
  const modalRoot = document.getElementById('modal-root');
  const toastRoot = document.getElementById('toast-root');
  const lotteryOverlay = document.getElementById('lottery-overlay');

  // ─── Init ────────────────────────────────────────────────
  function init() {
    applyTheme(state.settings.theme);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state.settings.reducedMotion = true;
    }
    bindNav();
    bindGlobalEvents();
    renderView('dashboard');
    refreshIcons();
  }

  function refreshIcons() {
    try {
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
      else if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    } catch (_) { /* optional */ }
  }

  function persist() {
    if (!saveData(state)) {
      toast('Could not save data. Storage may be full.', 'error');
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    state.settings.theme = theme;
  }

  // ─── Navigation ──────────────────────────────────────────
  function bindNav() {
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        renderView(view);
        sidebar.classList.remove('open');
      });
    });

    document.getElementById('menu-toggle')?.addEventListener('click', () => {
      sidebar.classList.add('open');
    });
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const next = state.settings.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      persist();
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });
  }

  function setActiveNav(view) {
    document.querySelectorAll('.nav-item').forEach((btn) => {
      const active = btn.dataset.view === view;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  const VIEW_TITLES = {
    dashboard: 'Dashboard',
    students: 'Student Management',
    topics: 'Presentation Topics',
    lottery: 'Lottery Setup',
    results: 'Results',
    history: 'Session History',
    settings: 'Settings',
  };

  function renderView(view) {
    currentView = view;
    setActiveNav(view);
    pageTitle.textContent = VIEW_TITLES[view] || 'GroupDraw';
    const renderers = {
      dashboard: renderDashboard,
      students: renderStudents,
      topics: renderTopics,
      lottery: renderLotterySetup,
      results: renderResults,
      history: renderHistory,
      settings: renderSettings,
    };
    (renderers[view] || renderDashboard)();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // ─── Toast & Modal ───────────────────────────────────────
  function toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    toastRoot.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  function openModal(html, { size = '' } = {}) {
    modalRoot.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true">${html}</div>`;
    modalRoot.hidden = false;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    modalRoot.querySelectorAll('[data-close-modal]').forEach((b) => b.addEventListener('click', closeModal));
    modalRoot.onclick = (e) => {
      if (e.target === modalRoot) closeModal();
    };
    document.addEventListener('keydown', onModalEsc);
  }

  function onModalEsc(e) {
    if (e.key === 'Escape') closeModal();
  }

  function closeModal() {
    modalRoot.hidden = true;
    modalRoot.innerHTML = '';
    document.removeEventListener('keydown', onModalEsc);
  }

  function confirmDialog(title, message, onConfirm) {
    openModal(`
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="btn-icon" data-close-modal aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body"><p>${escapeHtml(message)}</p></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-danger" id="confirm-yes">Confirm</button>
      </div>
    `);
    document.getElementById('confirm-yes')?.addEventListener('click', () => {
      closeModal();
      onConfirm();
    });
  }

  // ─── Dashboard ───────────────────────────────────────────
  function renderDashboard() {
    const students = state.students.filter((s) => s.status !== 'inactive');
    const topics = state.topics;
    const sessions = state.sessions;
    const lastSession = sessions[sessions.length - 1];
    const assigned = lastSession ? lastSession.groups.reduce((n, g) => n + g.members.length, 0) : 0;
    const unassigned = lastSession ? (lastSession.unassigned || []).length : 0;

    main.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-label">Total Students</div>
          <div class="stat-value">${students.length}</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-label">Topics</div>
          <div class="stat-value">${topics.length}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">Sessions</div>
          <div class="stat-value">${sessions.length}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">Last Assigned</div>
          <div class="stat-value">${assigned}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Last Unassigned</div>
          <div class="stat-value">${unassigned}</div>
        </div>
      </div>

      <div class="quick-actions">
        <button class="quick-action" data-goto="students"><i data-lucide="users"></i>Manage Students</button>
        <button class="quick-action" data-goto="topics"><i data-lucide="book-open"></i>Add Topics</button>
        <button class="quick-action" data-goto="lottery"><i data-lucide="dices"></i>Create Lottery</button>
        <button class="quick-action" data-goto="results"><i data-lucide="clipboard-list"></i>View Results</button>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Recent Lottery Sessions</h2>
        </div>
        <div class="card-body" style="padding:0">
          ${sessions.length === 0
            ? `<div class="empty-state"><i data-lucide="history"></i><h3>No sessions yet</h3><p>Run a lottery to see results here.</p></div>`
            : sessions.slice().reverse().slice(0, 5).map((s) => `
              <div class="history-item">
                <div>
                  <strong>${escapeHtml(s.title || 'Untitled Session')}</strong>
                  <div class="history-meta">${formatDateTime(s.createdAt)} · ${s.groups.length} groups · ID: ${escapeHtml(s.id.slice(-8))}</div>
                </div>
                <button class="btn btn-sm btn-secondary" data-open-session="${escapeHtml(s.id)}">Open</button>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;

    main.querySelectorAll('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => renderView(btn.dataset.goto));
    });
    main.querySelectorAll('[data-open-session]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state._viewSessionId = btn.dataset.openSession;
        renderView('results');
      });
    });
  }

  // ─── Students ────────────────────────────────────────────
  function renderStudents() {
    const q = (main.querySelector('#student-search')?.value || '').toLowerCase();
    const filterSem = main.querySelector('#filter-semester')?.value || '';
    const filterSec = main.querySelector('#filter-section')?.value || '';
    const sortBy = main.querySelector('#sort-students')?.value || 'roll';

    let list = state.students.slice();
    if (q) {
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q)
      );
    }
    if (filterSem) list = list.filter((s) => s.semester === filterSem);
    if (filterSec) list = list.filter((s) => s.section === filterSec);

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return a.roll.localeCompare(b.roll, undefined, { numeric: true });
    });

    const semesters = [...new Set(state.students.map((s) => s.semester).filter(Boolean))].sort();
    const sections = [...new Set(state.students.map((s) => s.section).filter(Boolean))].sort();

    main.innerHTML = `
      <div class="section-header">
        <h2>Students (${state.students.length})</h2>
        <div class="card-actions">
          <button class="btn btn-secondary" id="btn-import-students"><i data-lucide="upload"></i>Import</button>
          <button class="btn btn-secondary" id="btn-export-students"><i data-lucide="download"></i>Export CSV</button>
          <button class="btn btn-primary" id="btn-add-student"><i data-lucide="user-plus"></i>Add Student</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar-search">
          <i data-lucide="search"></i>
          <input type="search" id="student-search" placeholder="Search name or roll…" value="${escapeHtml(q)}" />
        </div>
        <select id="filter-semester" class="form-select" style="width:auto;min-width:140px">
          <option value="">All Semesters</option>
          ${semesters.map((s) => `<option value="${escapeHtml(s)}" ${s === filterSem ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
        </select>
        <select id="filter-section" class="form-select" style="width:auto;min-width:100px">
          <option value="">All Sections</option>
          ${sections.map((s) => `<option value="${escapeHtml(s)}" ${s === filterSec ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
        </select>
        <select id="sort-students" class="form-select" style="width:auto;min-width:120px">
          <option value="roll" ${sortBy === 'roll' ? 'selected' : ''}>Sort by Roll</option>
          <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Sort by Name</option>
        </select>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roll</th>
                <th>Name</th>
                <th>Semester</th>
                <th>Section</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.length === 0
                ? `<tr><td colspan="6"><div class="empty-state"><p>No students found. Add or import students to begin.</p></div></td></tr>`
                : list.map((s) => `
                  <tr>
                    <td><code>${escapeHtml(s.roll)}</code></td>
                    <td>${escapeHtml(s.name)}${s.isDemo ? ' <span class="badge badge-muted">Demo</span>' : ''}</td>
                    <td>${escapeHtml(s.semester || '—')}</td>
                    <td>${escapeHtml(s.section || '—')}</td>
                    <td><span class="badge ${s.status === 'inactive' ? 'badge-muted' : 'badge-success'}">${escapeHtml(s.status || 'active')}</span></td>
                    <td>
                      <div class="table-actions">
                        <button class="btn-icon" data-edit-student="${escapeHtml(s.id)}" title="Edit" aria-label="Edit"><i data-lucide="pencil"></i></button>
                        <button class="btn-icon" data-delete-student="${escapeHtml(s.id)}" title="Delete" aria-label="Delete"><i data-lucide="trash-2"></i></button>
                      </div>
                    </td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    const refilter = () => renderStudents();
    main.querySelector('#student-search')?.addEventListener('input', debounce(refilter, 200));
    main.querySelector('#filter-semester')?.addEventListener('change', refilter);
    main.querySelector('#filter-section')?.addEventListener('change', refilter);
    main.querySelector('#sort-students')?.addEventListener('change', refilter);

    main.querySelector('#btn-add-student')?.addEventListener('click', () => openStudentForm());
    main.querySelector('#btn-export-students')?.addEventListener('click', exportStudentsCSV);
    main.querySelector('#btn-import-students')?.addEventListener('click', openImportStudents);

    main.querySelectorAll('[data-edit-student]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = state.students.find((x) => x.id === btn.dataset.editStudent);
        if (s) openStudentForm(s);
      });
    });
    main.querySelectorAll('[data-delete-student]').forEach((btn) => {
      btn.addEventListener('click', () => {
        confirmDialog('Delete Student', 'Remove this student permanently?', () => {
          state.students = state.students.filter((x) => x.id !== btn.dataset.deleteStudent);
          persist();
          toast('Student deleted', 'success');
          renderStudents();
        });
      });
    });
  }

  function openStudentForm(student = null) {
    const isEdit = !!student;
    const s = student || {
      name: '', roll: '', semester: state.settings.defaultSemester, section: state.settings.defaultSection, status: 'active',
    };
    openModal(`
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Student' : 'Add Student'}</h3>
        <button class="btn-icon" data-close-modal aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="f-name">Name *</label>
          <input class="form-input" id="f-name" value="${escapeHtml(s.name)}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="f-roll">Roll Number *</label>
          <input class="form-input" id="f-roll" value="${escapeHtml(s.roll)}" required />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="f-sem">Semester</label>
            <input class="form-input" id="f-sem" value="${escapeHtml(s.semester || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="f-sec">Section</label>
            <input class="form-input" id="f-sec" value="${escapeHtml(s.section || '')}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-status">Status</label>
          <select class="form-select" id="f-status">
            <option value="active" ${s.status !== 'inactive' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${s.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div id="student-form-error" class="form-error" hidden></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" id="save-student">Save</button>
      </div>
    `);

    document.getElementById('save-student')?.addEventListener('click', () => {
      const name = document.getElementById('f-name').value.trim();
      const roll = document.getElementById('f-roll').value.trim();
      const semester = document.getElementById('f-sem').value.trim();
      const section = document.getElementById('f-sec').value.trim();
      const status = document.getElementById('f-status').value;
      const errEl = document.getElementById('student-form-error');

      if (!name || !roll) {
        errEl.textContent = 'Name and roll number are required.';
        errEl.hidden = false;
        return;
      }

      const dup = state.students.find(
        (x) => x.roll === roll && x.semester === semester && x.section === section && x.id !== (student?.id)
      );
      if (dup) {
        errEl.textContent = `Duplicate roll number "${roll}" in semester ${semester} section ${section}.`;
        errEl.hidden = false;
        return;
      }

      if (isEdit) {
        Object.assign(student, { name, roll, semester, section, status, isDemo: false });
        toast('Student updated', 'success');
      } else {
        state.students.push({
          id: generateId('stu'),
          name, roll, semester, section, status, isDemo: false,
        });
        toast('Student added', 'success');
      }
      persist();
      closeModal();
      renderStudents();
    });
  }

  function exportStudentsCSV() {
    const rows = [['Roll', 'Name', 'Semester', 'Section', 'Status']];
    state.students.forEach((s) => {
      rows.push([s.roll, s.name, s.semester || '', s.section || '', s.status || 'active']);
    });
    downloadCSV(rows, 'students.csv');
    toast('CSV exported', 'success');
  }

  function openImportStudents() {
    openModal(`
      <div class="modal-header">
        <h3>Import Students</h3>
        <button class="btn-icon" data-close-modal aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <p class="form-hint" style="margin-bottom:1rem">Upload CSV/Excel or paste tab-separated data (Roll, Name, Semester, Section).</p>
        <div class="form-group">
          <label class="form-label">File (CSV / XLSX)</label>
          <input type="file" id="import-file" accept=".csv,.xlsx,.xls,.txt" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Or paste data</label>
          <textarea id="import-paste" class="form-textarea" rows="6" placeholder="262311046&#9;FAHIM ABDULLAH&#9;Spring 2026&#9;A"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Default Semester</label>
            <input class="form-input" id="import-sem" value="${escapeHtml(state.settings.defaultSemester)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Default Section</label>
            <input class="form-input" id="import-sec" value="${escapeHtml(state.settings.defaultSection)}" />
          </div>
        </div>
        <div id="import-preview"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" id="run-import" disabled>Import</button>
      </div>
    `, { size: 'modal-lg' });

    let pending = [];

    function processRows(rawRows) {
      const defSem = document.getElementById('import-sem').value.trim();
      const defSec = document.getElementById('import-sec').value.trim();
      const errors = [];
      const valid = [];
      const seen = new Set();

      rawRows.forEach((row, i) => {
        const cells = row.map((c) => String(c || '').trim());
        // Skip header-like rows
        if (i === 0 && /roll/i.test(cells[0])) return;
        if (cells.every((c) => !c)) return;

        let roll = cells[0] || '';
        let name = cells[1] || '';
        let semester = cells[2] || defSem;
        let section = cells[3] || defSec;

        // Support "ROLL\tName" only
        if (!name && cells.length === 1 && cells[0].includes('\t')) {
          const parts = cells[0].split(/\t+/);
          roll = parts[0];
          name = parts[1] || '';
        }

        if (!roll || !name) {
          errors.push(`Row ${i + 1}: missing roll or name`);
          return;
        }
        const key = `${roll}|${semester}|${section}`;
        if (seen.has(key)) {
          errors.push(`Row ${i + 1}: duplicate ${roll} in import`);
          return;
        }
        const existing = state.students.find(
          (x) => x.roll === roll && x.semester === semester && x.section === section
        );
        if (existing) {
          errors.push(`Row ${i + 1}: roll ${roll} already exists`);
          return;
        }
        seen.add(key);
        valid.push({ roll, name, semester, section, status: 'active' });
      });

      pending = valid;
      const preview = document.getElementById('import-preview');
      preview.innerHTML = `
        <p><strong>${valid.length}</strong> valid · <strong>${errors.length}</strong> errors</p>
        ${valid.length ? `
          <div class="import-preview table-wrap">
            <table>
              <thead><tr><th>Roll</th><th>Name</th><th>Semester</th><th>Section</th></tr></thead>
              <tbody>${valid.slice(0, 50).map((r) => `
                <tr><td>${escapeHtml(r.roll)}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.semester)}</td><td>${escapeHtml(r.section)}</td></tr>
              `).join('')}${valid.length > 50 ? `<tr><td colspan="4">…and ${valid.length - 50} more</td></tr>` : ''}
              </tbody>
            </table>
          </div>
        ` : ''}
        ${errors.length ? `<ul class="error-list">${errors.slice(0, 15).map((e) => `<li>${escapeHtml(e)}</li>`).join('')}${errors.length > 15 ? `<li>…${errors.length - 15} more</li>` : ''}</ul>` : ''}
      `;
      document.getElementById('run-import').disabled = valid.length === 0;
    }

    document.getElementById('import-file')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        if (file.name.match(/\.xlsx?$/i) && typeof XLSX !== 'undefined') {
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf);
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          processRows(rows);
        } else {
          const text = await file.text();
          const rows = text.split(/\r?\n/).map((line) => line.split(/[\t,]/).map((c) => c.replace(/^"|"$/g, '')));
          processRows(rows);
        }
      } catch (err) {
        toast('Failed to read file: ' + err.message, 'error');
      }
    });

    document.getElementById('import-paste')?.addEventListener('input', (e) => {
      const text = e.target.value;
      if (!text.trim()) return;
      const rows = text.split(/\r?\n/).map((line) => line.split(/\t/).map((c) => c.trim()));
      processRows(rows);
    });

    document.getElementById('run-import')?.addEventListener('click', () => {
      pending.forEach((r) => {
        state.students.push({
          id: generateId('stu'),
          ...r,
          isDemo: false,
        });
      });
      persist();
      closeModal();
      toast(`Imported ${pending.length} students`, 'success');
      renderStudents();
    });
  }

  // ─── Topics ──────────────────────────────────────────────
  function renderTopics() {
    main.innerHTML = `
      <div class="section-header">
        <h2>Topics (${state.topics.length})</h2>
        <button class="btn btn-primary" id="btn-add-topic"><i data-lucide="plus"></i>Add Topic</button>
      </div>
      <div class="card">
        ${state.topics.length === 0
          ? `<div class="empty-state"><i data-lucide="book-open"></i><h3>No topics yet</h3><p>Add presentation topics for lottery assignment.</p></div>`
          : `<div class="table-wrap"><table>
              <thead><tr><th>Title</th><th>Course</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                ${state.topics.map((t) => `
                  <tr>
                    <td><strong>${escapeHtml(t.title)}</strong>${t.description ? `<div class="form-hint">${escapeHtml(t.description.slice(0, 80))}</div>` : ''}</td>
                    <td>${escapeHtml([t.courseCode, t.courseName].filter(Boolean).join(' — ') || '—')}</td>
                    <td>${escapeHtml(t.presentationDate || '—')}</td>
                    <td>
                      <div class="table-actions">
                        <button class="btn-icon" data-edit-topic="${escapeHtml(t.id)}" aria-label="Edit"><i data-lucide="pencil"></i></button>
                        <button class="btn-icon" data-delete-topic="${escapeHtml(t.id)}" aria-label="Delete"><i data-lucide="trash-2"></i></button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table></div>`
        }
      </div>
    `;

    main.querySelector('#btn-add-topic')?.addEventListener('click', () => openTopicForm());
    main.querySelectorAll('[data-edit-topic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = state.topics.find((x) => x.id === btn.dataset.editTopic);
        if (t) openTopicForm(t);
      });
    });
    main.querySelectorAll('[data-delete-topic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        confirmDialog('Delete Topic', 'Remove this topic?', () => {
          state.topics = state.topics.filter((x) => x.id !== btn.dataset.deleteTopic);
          persist();
          toast('Topic deleted', 'success');
          renderTopics();
        });
      });
    });
  }

  function openTopicForm(topic = null) {
    const isEdit = !!topic;
    const t = topic || { title: '', courseCode: '', courseName: '', description: '', presentationDate: '', notes: '' };
    openModal(`
      <div class="modal-header">
        <h3>${isEdit ? 'Edit Topic' : 'Add Topic'}</h3>
        <button class="btn-icon" data-close-modal aria-label="Close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="t-title">Topic Title *</label>
          <input class="form-input" id="t-title" value="${escapeHtml(t.title)}" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="t-code">Course Code</label>
            <input class="form-input" id="t-code" value="${escapeHtml(t.courseCode || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="t-cname">Course Name</label>
            <input class="form-input" id="t-cname" value="${escapeHtml(t.courseName || '')}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="t-date">Presentation Date</label>
          <input class="form-input" type="date" id="t-date" value="${escapeHtml(t.presentationDate || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label" for="t-desc">Description</label>
          <textarea class="form-textarea" id="t-desc">${escapeHtml(t.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="t-notes">Notes</label>
          <textarea class="form-textarea" id="t-notes">${escapeHtml(t.notes || '')}</textarea>
        </div>
        <div id="topic-form-error" class="form-error" hidden></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" id="save-topic">Save</button>
      </div>
    `);

    document.getElementById('save-topic')?.addEventListener('click', () => {
      const title = document.getElementById('t-title').value.trim();
      if (!title) {
        const err = document.getElementById('topic-form-error');
        err.textContent = 'Title is required.';
        err.hidden = false;
        return;
      }
      const data = {
        title,
        courseCode: document.getElementById('t-code').value.trim(),
        courseName: document.getElementById('t-cname').value.trim(),
        presentationDate: document.getElementById('t-date').value,
        description: document.getElementById('t-desc').value.trim(),
        notes: document.getElementById('t-notes').value.trim(),
      };
      if (isEdit) {
        Object.assign(topic, data);
        toast('Topic updated', 'success');
      } else {
        state.topics.push({ id: generateId('top'), ...data });
        toast('Topic added', 'success');
      }
      persist();
      closeModal();
      renderTopics();
    });
  }

  // ─── Lottery Setup Wizard ────────────────────────────────
  let wizardData = null;

  function renderLotterySetup() {
    wizardData = {
      step: 1,
      semester: state.settings.defaultSemester,
      section: state.settings.defaultSection,
      selectedStudentIds: [],
      selectedTopicIds: [],
      groupSize: state.settings.defaultGroupSize,
      customSize: '',
      leftoverPolicy: 'smaller',
      topicMode: 'different',
      speed: 'normal',
      sessionTitle: `Lottery ${new Date().toLocaleDateString()}`,
    };

    // Pre-select active students matching default sem/sec
    const eligible = state.students.filter(
      (s) => s.status !== 'inactive' &&
        (!wizardData.semester || s.semester === wizardData.semester) &&
        (!wizardData.section || s.section === wizardData.section)
    );
    wizardData.selectedStudentIds = eligible.map((s) => s.id);

    renderWizard();
  }

  function renderWizard() {
    const w = wizardData;
    const steps = ['Filter', 'Students', 'Topics', 'Config', 'Preview'];

    main.innerHTML = `
      <div class="wizard">
        <div class="wizard-steps">
          ${steps.map((label, i) => {
            const n = i + 1;
            let cls = 'wizard-step';
            if (n === w.step) cls += ' active';
            else if (n < w.step) cls += ' done';
            return `<div class="${cls}">${n}. ${label}</div>`;
          }).join('')}
        </div>
        <div class="card">
          <div class="card-body" id="wizard-body"></div>
          <div class="modal-footer" style="border-top:1px solid var(--border)">
            <button class="btn btn-secondary" id="wiz-back" ${w.step === 1 ? 'disabled' : ''}>Back</button>
            <button class="btn btn-primary" id="wiz-next">${w.step === 5 ? '🎲 Start Lottery' : 'Next'}</button>
          </div>
        </div>
      </div>
    `;

    const body = document.getElementById('wizard-body');
    if (w.step === 1) renderWizStep1(body);
    else if (w.step === 2) renderWizStep2(body);
    else if (w.step === 3) renderWizStep3(body);
    else if (w.step === 4) renderWizStep4(body);
    else renderWizStep5(body);

    document.getElementById('wiz-back')?.addEventListener('click', () => {
      if (w.step > 1) { w.step--; renderWizard(); }
    });
    document.getElementById('wiz-next')?.addEventListener('click', () => {
      if (w.step < 5) {
        if (!validateWizardStep(w.step)) return;
        w.step++;
        renderWizard();
      } else {
        startLotteryFromWizard();
      }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function validateWizardStep(step) {
    const w = wizardData;
    if (step === 2 && w.selectedStudentIds.length === 0) {
      toast('Select at least one student', 'error');
      return false;
    }
    if (step === 4) {
      const size = w.customSize ? parseInt(w.customSize, 10) : w.groupSize;
      if (!size || size < 1) {
        toast('Invalid group size', 'error');
        return false;
      }
    }
    return true;
  }

  function renderWizStep1(body) {
    const semesters = [...new Set(state.students.map((s) => s.semester).filter(Boolean))].sort();
    const sections = [...new Set(state.students.map((s) => s.section).filter(Boolean))].sort();
    body.innerHTML = `
      <h3 style="margin-bottom:1rem">Select Semester & Section</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Semester</label>
          <select class="form-select" id="w-sem">
            <option value="">All</option>
            ${semesters.map((s) => `<option value="${escapeHtml(s)}" ${s === wizardData.semester ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Section</label>
          <select class="form-select" id="w-sec">
            <option value="">All</option>
            ${sections.map((s) => `<option value="${escapeHtml(s)}" ${s === wizardData.section ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Session Title</label>
        <input class="form-input" id="w-title" value="${escapeHtml(wizardData.sessionTitle)}" />
      </div>
    `;
    const refreshEligible = () => {
      const eligible = state.students.filter(
        (s) => s.status !== 'inactive' &&
          (!wizardData.semester || s.semester === wizardData.semester) &&
          (!wizardData.section || s.section === wizardData.section)
      );
      wizardData.selectedStudentIds = eligible.map((s) => s.id);
    };
    body.querySelector('#w-sem')?.addEventListener('change', (e) => {
      wizardData.semester = e.target.value;
      refreshEligible();
    });
    body.querySelector('#w-sec')?.addEventListener('change', (e) => {
      wizardData.section = e.target.value;
      refreshEligible();
    });
    body.querySelector('#w-title')?.addEventListener('input', (e) => {
      wizardData.sessionTitle = e.target.value.trim();
    });
  }

  function renderWizStep2(body) {
    const students = state.students.filter((s) => {
      if (s.status === 'inactive') return false;
      if (wizardData.semester && s.semester !== wizardData.semester) return false;
      if (wizardData.section && s.section !== wizardData.section) return false;
      return true;
    });

    body.innerHTML = `
      <h3 style="margin-bottom:0.5rem">Select Participating Students</h3>
      <p class="form-hint" style="margin-bottom:0.75rem">${students.length} eligible · ${wizardData.selectedStudentIds.length} selected</p>
      <div style="margin-bottom:0.5rem;display:flex;gap:0.5rem">
        <button class="btn btn-sm btn-secondary" id="sel-all">Select All</button>
        <button class="btn btn-sm btn-secondary" id="sel-none">Deselect All</button>
      </div>
      <div class="student-select-list">
        ${students.map((s) => `
          <label class="student-select-item">
            <input type="checkbox" value="${escapeHtml(s.id)}" ${wizardData.selectedStudentIds.includes(s.id) ? 'checked' : ''} />
            <span><code>${escapeHtml(s.roll)}</code> — ${escapeHtml(s.name)}</span>
          </label>
        `).join('') || '<p class="form-hint">No students match the filter.</p>'}
      </div>
    `;

    body.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!wizardData.selectedStudentIds.includes(cb.value)) {
            wizardData.selectedStudentIds.push(cb.value);
          }
        } else {
          wizardData.selectedStudentIds = wizardData.selectedStudentIds.filter((id) => id !== cb.value);
        }
      });
    });
    body.querySelector('#sel-all')?.addEventListener('click', () => {
      wizardData.selectedStudentIds = students.map((s) => s.id);
      renderWizard();
    });
    body.querySelector('#sel-none')?.addEventListener('click', () => {
      wizardData.selectedStudentIds = [];
      renderWizard();
    });
  }

  function renderWizStep3(body) {
    body.innerHTML = `
      <h3 style="margin-bottom:0.75rem">Select Topics (optional)</h3>
      <p class="form-hint" style="margin-bottom:0.75rem">Leave empty if topics will be assigned later. Select one or more for automatic assignment.</p>
      <div class="student-select-list">
        ${state.topics.length === 0
          ? '<p class="form-hint">No topics created yet. You can continue without topics.</p>'
          : state.topics.map((t) => `
            <label class="student-select-item">
              <input type="checkbox" value="${escapeHtml(t.id)}" ${wizardData.selectedTopicIds.includes(t.id) ? 'checked' : ''} />
              <span>${escapeHtml(t.title)}</span>
            </label>
          `).join('')
        }
      </div>
      ${state.topics.length > 0 ? `
        <div class="form-group" style="margin-top:1rem">
          <label class="form-label">Topic Assignment</label>
          <select class="form-select" id="w-topic-mode">
            <option value="different" ${wizardData.topicMode === 'different' ? 'selected' : ''}>Different topic per group (cycle)</option>
            <option value="same" ${wizardData.topicMode === 'same' ? 'selected' : ''}>Same topic for all groups</option>
          </select>
        </div>
      ` : ''}
    `;
    body.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', () => {
        if (cb.checked) wizardData.selectedTopicIds.push(cb.value);
        else wizardData.selectedTopicIds = wizardData.selectedTopicIds.filter((id) => id !== cb.value);
      });
    });
    body.querySelector('#w-topic-mode')?.addEventListener('change', (e) => {
      wizardData.topicMode = e.target.value;
    });
  }

  function renderWizStep4(body) {
    body.innerHTML = `
      <h3 style="margin-bottom:1rem">Group Configuration</h3>
      <div class="form-group">
        <label class="form-label">Group Size</label>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          ${[2, 3, 4, 5].map((n) => `
            <label class="checkbox-label" style="padding:0.5rem 0.75rem;border:1px solid var(--border);border-radius:var(--radius-sm)">
              <input type="radio" name="gsize" value="${n}" ${wizardData.groupSize === n && !wizardData.customSize ? 'checked' : ''} />
              ${n}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Custom Size</label>
        <input class="form-input" type="number" min="1" max="50" id="w-custom" value="${escapeHtml(wizardData.customSize)}" placeholder="Optional" style="max-width:120px" />
      </div>
      <div class="form-group">
        <label class="form-label">Leftover Students</label>
        <select class="form-select" id="w-leftover">
          <option value="smaller" ${wizardData.leftoverPolicy === 'smaller' ? 'selected' : ''}>Allow a smaller final group</option>
          <option value="even" ${wizardData.leftoverPolicy === 'even' ? 'selected' : ''}>Distribute as evenly as possible</option>
          <option value="unassigned" ${wizardData.leftoverPolicy === 'unassigned' ? 'selected' : ''}>Leave leftover students unassigned</option>
        </select>
      </div>
    `;
    body.querySelectorAll('input[name=gsize]').forEach((r) => {
      r.addEventListener('change', () => {
        wizardData.groupSize = parseInt(r.value, 10);
        wizardData.customSize = '';
        document.getElementById('w-custom').value = '';
      });
    });
    body.querySelector('#w-custom')?.addEventListener('input', (e) => {
      wizardData.customSize = e.target.value;
    });
    body.querySelector('#w-leftover')?.addEventListener('change', (e) => {
      wizardData.leftoverPolicy = e.target.value;
    });
  }

  function renderWizStep5(body) {
    const size = wizardData.customSize ? parseInt(wizardData.customSize, 10) : wizardData.groupSize;
    const n = wizardData.selectedStudentIds.length;
    let expectedGroups = 0;
    let leftover = 0;
    if (wizardData.leftoverPolicy === 'even') {
      expectedGroups = Math.max(1, Math.ceil(n / size));
      leftover = 0;
    } else if (wizardData.leftoverPolicy === 'unassigned') {
      expectedGroups = Math.floor(n / size);
      leftover = n % size;
    } else {
      expectedGroups = Math.ceil(n / size);
      leftover = n % size === 0 ? 0 : size - (n % size);
    }

    const topics = state.topics.filter((t) => wizardData.selectedTopicIds.includes(t.id));

    body.innerHTML = `
      <h3 style="margin-bottom:1rem">Preview</h3>
      <div class="preview-box">
        <h4>Summary</h4>
        <p><strong>Session:</strong> ${escapeHtml(wizardData.sessionTitle)}</p>
        <p><strong>Students:</strong> ${n}</p>
        <p><strong>Group size:</strong> ${size}</p>
        <p><strong>Expected groups:</strong> ${expectedGroups}</p>
        <p><strong>Leftover policy:</strong> ${escapeHtml(wizardData.leftoverPolicy)}</p>
        ${leftover > 0 && wizardData.leftoverPolicy === 'unassigned'
          ? `<p style="color:var(--warning)"><strong>⚠ ${leftover} student(s) will remain unassigned</strong></p>`
          : ''}
        <p><strong>Topics:</strong> ${topics.length ? topics.map((t) => escapeHtml(t.title)).join(', ') : 'None'}</p>
        <p><strong>Topic mode:</strong> ${wizardData.topicMode}</p>
      </div>

      <div class="draw-options">
        <div class="form-group" style="margin:0">
          <label class="form-label" for="w-speed">Reveal style</label>
          <select class="form-select" id="w-speed" style="min-width:170px">
            <option value="fast" ${wizardData.speed === 'fast' ? 'selected' : ''}>⚡ Fast</option>
            <option value="normal" ${!wizardData.speed || wizardData.speed === 'normal' ? 'selected' : ''}>🎰 Normal</option>
            <option value="dramatic" ${wizardData.speed === 'dramatic' ? 'selected' : ''}>🎭 Dramatic</option>
          </select>
        </div>
        <label class="checkbox-label"><input type="checkbox" id="w-sound" ${state.settings.soundEnabled ? 'checked' : ''} /> 🔊 Sound effects</label>
      </div>

      <p class="form-hint" style="margin-top:1rem">The draw will shuffle all selected students fairly using Fisher–Yates. Results are fixed when the lottery starts.</p>
    `;

    body.querySelector('#w-speed')?.addEventListener('change', (e) => { wizardData.speed = e.target.value; });
    body.querySelector('#w-sound')?.addEventListener('change', (e) => {
      state.settings.soundEnabled = e.target.checked;
      persist();
    });
  }

  function startLotteryFromWizard() {
    const size = wizardData.customSize ? parseInt(wizardData.customSize, 10) : wizardData.groupSize;
    const students = state.students.filter((s) => wizardData.selectedStudentIds.includes(s.id));
    if (students.length === 0) {
      toast('No students selected', 'error');
      return;
    }
    if (!size || size < 1) {
      toast('Invalid group size', 'error');
      return;
    }

    // Pre-compute the entire draw (fair shuffle)
    const shuffled = fisherYatesShuffle(students);
    const { groups: rawGroups, unassigned } = createGroups(shuffled, size, wizardData.leftoverPolicy);
    const topics = state.topics.filter((t) => wizardData.selectedTopicIds.includes(t.id));
    const groups = assignTopics(rawGroups, topics, wizardData.topicMode);

    const session = {
      id: generateId('ses'),
      title: wizardData.sessionTitle || 'Lottery Session',
      createdAt: new Date().toISOString(),
      semester: wizardData.semester,
      section: wizardData.section,
      groupSize: size,
      leftoverPolicy: wizardData.leftoverPolicy,
      topicMode: wizardData.topicMode,
      groups,
      unassigned,
      locked: false,
      history: [{ action: 'created', at: new Date().toISOString() }],
    };

    lotteryState = {
      session,
      phase: 'ready', // ready | countdown | spinning | paused | done
      currentGroupIndex: 0,
      runId: 0,
      speed: wizardData.speed || 'normal', // fast | normal | dramatic
      revealedGroups: [],
      soundEnabled: state.settings.soundEnabled,
    };

    openLotteryOverlay();
  }

  // ─── Lottery Animation (premium, funny, with sound) ──────
  const CANCELLED = Symbol('cancelled');
  const MASCOTS = ['🎲', '🎰', '🍀', '🔮', '🎩', '🦄', '🚀', '🎯', '🧙', '🐙', '👻', '🤖', '🍕', '🐸'];
  const SPIN_LINES = [
    'Shaking the magic hat…', 'Consulting the lottery goblins…', 'Bribing Math.random()…',
    'Asking the universe nicely…', 'Spinning the wheel of destiny…', 'Summoning fairness…',
    'Untangling the group chat…', 'Feeding the algorithm snacks…', 'No peeking!…',
  ];
  const REVEAL_LINES = [
    'Congrats… or condolences? 😅', 'No refunds. No swaps. 🙃', 'The universe has spoken 🔮',
    'Destiny approves ✅', 'Good luck, you will need it 😎', 'Teamwork makes the dream work 🤝',
    'Plot twist! 🎬', 'Fate, but make it fair ⚖️',
  ];
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const speedMul = () => ({ fast: 0.5, normal: 1, dramatic: 1.7 }[lotteryState?.speed] || 1);
  const isReduced = () => !!state.settings.reducedMotion;
  const $ = (id) => document.getElementById(id);

  /* ---------- Sound engine (WebAudio, no files needed) ---------- */
  const FX = (() => {
    let ctx = null, master = null, enabled = true;
    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur, o = {}) {
      const a = enabled && ensure();
      if (!a) return;
      const t = a.currentTime + (o.when || 0);
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.25, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
    function noise(dur, o = {}) {
      const a = enabled && ensure();
      if (!a) return;
      const t = a.currentTime + (o.when || 0);
      const len = Math.max(1, Math.floor(a.sampleRate * dur));
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource();
      src.buffer = buf;
      const f = a.createBiquadFilter();
      f.type = o.type || 'bandpass';
      f.frequency.setValueAtTime(o.from || 800, t);
      f.frequency.exponentialRampToValueAtTime(o.to || 3000, t + dur);
      f.Q.value = 1.2;
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(master);
      src.start(t);
    }
    return {
      setEnabled(v) { enabled = !!v; },
      unlock() { ensure(); },
      tick(i = 0) { tone(520 + (i % 7) * 45, 0.06, { type: 'square', vol: 0.09 }); },
      beep() { tone(660, 0.16, { type: 'sine', vol: 0.3 }); },
      go() {
        [523, 659, 784].forEach((f) => tone(f, 0.5, { type: 'triangle', vol: 0.25 }));
        tone(1047, 0.6, { type: 'sine', vol: 0.2, when: 0.05 });
        noise(0.5, { from: 400, to: 6000, vol: 0.25 });
      },
      startJingle() {
        // rising arpeggio + riser: "the draw begins!"
        [392, 494, 587, 784].forEach((f, i) => tone(f, 0.18, { type: 'square', vol: 0.14, when: i * 0.09 }));
        noise(0.6, { from: 300, to: 5000, vol: 0.22 });
      },
      whoosh() { noise(0.35, { from: 500, to: 4500, vol: 0.28 }); tone(180, 0.3, { type: 'sawtooth', vol: 0.1, slideTo: 60 }); },
      boom() { tone(120, 0.35, { type: 'sine', vol: 0.5, slideTo: 40 }); noise(0.2, { type: 'lowpass', from: 900, to: 120, vol: 0.3 }); },
      ding() { [988, 1319, 1760].forEach((f, i) => tone(f, 0.7, { type: 'sine', vol: 0.18, when: i * 0.06 })); },
      pop(when = 0) { tone(420, 0.09, { type: 'sine', vol: 0.25, slideTo: 900, when }); },
      boing() { tone(260, 0.28, { type: 'sine', vol: 0.25, slideTo: 90 }); },
      fanfare() {
        const seq = [523, 659, 784, 1047, 784, 1047, 1319];
        seq.forEach((f, i) => tone(f, 0.28, { type: 'triangle', vol: 0.26, when: i * 0.11 }));
        [523, 659, 784, 1047].forEach((f) => tone(f, 1.1, { type: 'sawtooth', vol: 0.07, when: 0.8 }));
        noise(1, { from: 1200, to: 8000, vol: 0.18, when: 0.75 });
      },
    };
  })();

  /* ---------- Confetti ---------- */
  const Confetti = (() => {
    let canvas = null, c = null, parts = [], raf = null;
    const COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#f87171', '#ffffff'];
    function resize() {
      if (!canvas) return;
      const d = window.devicePixelRatio || 1;
      canvas.width = innerWidth * d;
      canvas.height = innerHeight * d;
      c.setTransform(d, 0, 0, d, 0, 0);
    }
    function init(cv) {
      canvas = cv;
      c = cv.getContext('2d');
      resize();
      window.removeEventListener('resize', resize);
      window.addEventListener('resize', resize);
    }
    function burst(x, y, count = 80, power = 1) {
      if (!c || isReduced()) return;
      for (let i = 0; i < count; i++) {
        parts.push({
          x, y, vx: (Math.random() - 0.5) * 14 * power, vy: (-Math.random() * 13 - 4) * power,
          g: 0.3, size: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          color: pickOne(COLORS), life: 0, max: 90 + Math.random() * 70, round: Math.random() < 0.3,
        });
      }
      start();
    }
    function rain(count = 140) {
      if (!c || isReduced()) return;
      for (let i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * innerWidth, y: -20 - Math.random() * 300,
          vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, g: 0.05,
          size: 6 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
          color: pickOne(COLORS), life: 0, max: 220 + Math.random() * 100, round: Math.random() < 0.3,
        });
      }
      start();
    }
    function start() { if (!raf) raf = requestAnimationFrame(loop); }
    function loop() {
      c.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter((p) => p.life < p.max && p.y < innerHeight + 40);
      parts.forEach((p) => {
        p.life++; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
        c.save();
        c.globalAlpha = Math.max(0, 1 - p.life / p.max);
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.color;
        if (p.round) { c.beginPath(); c.arc(0, 0, p.size / 2, 0, 6.3); c.fill(); }
        else c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        c.restore();
      });
      raf = parts.length ? requestAnimationFrame(loop) : null;
      if (!parts.length) c.clearRect(0, 0, innerWidth, innerHeight);
    }
    function clear() {
      parts = [];
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      c?.clearRect(0, 0, innerWidth, innerHeight);
    }
    return { init, burst, rain, clear };
  })();

  /* ---------- Overlay ---------- */
  function lotteryKeys(e) {
    if (!lotteryState || lotteryOverlay.hidden || !modalRoot.hidden) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (lotteryState.phase === 'ready') beginDrawAnimation();
      else if (['spinning', 'countdown', 'paused'].includes(lotteryState.phase)) togglePauseDraw();
      else if (lotteryState.phase === 'done') finishLottery();
    } else if (e.key === 'm' || e.key === 'M') {
      toggleMute();
    }
  }

  function setIconButton(btn, icon) {
    btn.innerHTML = `<i data-lucide="${icon}"></i>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function toggleMute() {
    lotteryState.soundEnabled = !lotteryState.soundEnabled;
    FX.setEnabled(lotteryState.soundEnabled);
    setIconButton($('lottery-mute'), lotteryState.soundEnabled ? 'volume-2' : 'volume-x');
    if (lotteryState.soundEnabled) { FX.unlock(); FX.pop(); }
  }

  function openLotteryOverlay() {
    FX.setEnabled(lotteryState.soundEnabled);

    const floaters = Array.from({ length: 14 }, () => {
      const left = Math.random() * 100;
      const dur = 9 + Math.random() * 9;
      const del = -Math.random() * 12;
      const size = 1.2 + Math.random() * 1.8;
      return `<span class="fx-floater" style="left:${left}%;animation-duration:${dur}s;animation-delay:${del}s;font-size:${size}rem">${pickOne(MASCOTS)}</span>`;
    }).join('');

    lotteryOverlay.className = 'lottery-overlay';
    lotteryOverlay.innerHTML = `
      <div class="fx-floaters" aria-hidden="true">${floaters}</div>
      <canvas class="fx-canvas" id="fx-canvas" aria-hidden="true"></canvas>
      <div class="lottery-stage">
        <div class="lottery-header">
          <h2 id="lottery-session-title"></h2>
          <div class="lottery-header-actions">
            <button class="btn-icon lottery-btn" id="lottery-mute" title="Mute (M)" aria-label="Toggle sound"></button>
            <button class="btn-icon lottery-btn" id="lottery-fs-exit" title="Exit" aria-label="Exit"></button>
          </div>
        </div>

        <div class="lottery-display">
          <div class="lottery-spinner" id="lottery-spinner">
            <div class="spin-mascot" id="spin-mascot">🎲</div>
            <div class="spin-name" id="spin-name">Ready to Draw</div>
            <div class="spin-roll" id="spin-roll"></div>
            <div class="spin-members" id="spin-members"></div>
            <div class="spin-flavor" id="spin-flavor">Press Space or hit the button 🎬</div>
          </div>
          <div class="lottery-progress">
            <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
            <div id="progress-text"></div>
          </div>
        </div>

        <div class="lottery-groups-preview" id="lottery-groups-preview"></div>

        <div class="lottery-actions">
          <button class="btn btn-primary btn-lg btn-glow" id="btn-start-draw"></button>
          <button class="btn btn-secondary btn-lg" id="btn-pause-draw" hidden></button>
          <button class="btn btn-ghost btn-lg lottery-skip" id="btn-reveal-all" hidden></button>
        </div>
        <div class="lottery-hint">Space = start / pause · M = mute</div>
      </div>
    `;

    $('lottery-session-title').textContent = lotteryState.session.title;
    $('progress-text').textContent = `0 / ${lotteryState.session.groups.length} groups`;
    $('btn-start-draw').innerHTML = '<i data-lucide="sparkles"></i> Start the Draw!';
    $('btn-pause-draw').innerHTML = '<i data-lucide="pause"></i> Pause';
    $('btn-reveal-all').innerHTML = '<i data-lucide="fast-forward"></i> Skip to results';
    setIconButton($('lottery-mute'), lotteryState.soundEnabled ? 'volume-2' : 'volume-x');
    setIconButton($('lottery-fs-exit'), 'x');

    lotteryOverlay.hidden = false;
    Confetti.init($('fx-canvas'));

    $('btn-start-draw').onclick = beginDrawAnimation;
    $('btn-pause-draw').onclick = togglePauseDraw;
    $('btn-reveal-all').onclick = revealAllGroups;
    $('lottery-mute').onclick = toggleMute;
    $('lottery-fs-exit').onclick = () => {
      const ph = lotteryState.phase;
      if (ph === 'ready') { closeLotteryOverlay(); lotteryState = null; return; }
      if (ph === 'done') { finishLottery(); return; }
      confirmDialog('Exit Lottery?', 'Results are already computed. Skip the show and save them?', finishLottery);
    };

    document.removeEventListener('keydown', lotteryKeys);
    document.addEventListener('keydown', lotteryKeys);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function closeLotteryOverlay() {
    Confetti.clear();
    document.removeEventListener('keydown', lotteryKeys);
    lotteryOverlay.hidden = true;
    lotteryOverlay.innerHTML = '';
    lotteryOverlay.classList.remove('celebrate');
  }

  /* ---------- Flow helpers ---------- */
  async function wait(ms, runId) {
    let left = ms;
    while (left > 0) {
      if (!lotteryState || lotteryState.runId !== runId) throw CANCELLED;
      if (lotteryState.phase === 'paused') { await delay(120); continue; }
      const step = Math.min(40, left);
      await delay(step);
      left -= step;
    }
    if (!lotteryState || lotteryState.runId !== runId) throw CANCELLED;
  }

  function retrigger(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  async function beginDrawAnimation() {
    if (!lotteryState || lotteryState.phase !== 'ready') return;
    FX.unlock();
    FX.setEnabled(lotteryState.soundEnabled);
    const runId = ++lotteryState.runId;
    lotteryState.phase = 'countdown';
    lotteryState.currentGroupIndex = 0;
    lotteryState.revealedGroups = [];
    $('lottery-groups-preview').innerHTML = '';
    $('btn-start-draw').hidden = true;
    $('btn-pause-draw').hidden = false;
    $('btn-reveal-all').hidden = false;
    $('spin-members').innerHTML = '';
    $('spin-roll').textContent = '';

    try {
      FX.startJingle();
      await runCountdown(runId);
      lotteryState.phase = 'spinning';
      const groups = lotteryState.session.groups;
      for (let i = 0; i < groups.length; i++) {
        lotteryState.currentGroupIndex = i;
        await drawGroup(i, runId);
      }
      finishAnimation();
    } catch (e) {
      if (e !== CANCELLED) console.error(e);
    }
  }

  async function runCountdown(runId) {
    const name = $('spin-name');
    const spinner = $('lottery-spinner');
    const mascot = $('spin-mascot');
    $('spin-flavor').textContent = 'Get ready…';
    spinner.classList.add('countdown');
    const steps = isReduced() ? ['GO!'] : ['3', '2', '1', 'GO!'];
    for (const s of steps) {
      name.textContent = s;
      mascot.textContent = s === 'GO!' ? '🚀' : '⏳';
      name.classList.toggle('is-go', s === 'GO!');
      retrigger(name, 'count-pop');
      if (s === 'GO!') FX.go(); else FX.beep();
      await wait((isReduced() ? 250 : 750) * (s === 'GO!' ? 0.8 : 1), runId);
    }
    name.classList.remove('is-go', 'count-pop');
    spinner.classList.remove('countdown');
  }

  async function drawGroup(idx, runId) {
    const session = lotteryState.session;
    const group = session.groups[idx];
    const spinner = $('lottery-spinner');
    const name = $('spin-name');
    const roll = $('spin-roll');
    const mascot = $('spin-mascot');
    const membersEl = $('spin-members');
    const flavor = $('spin-flavor');
    const reduced = isReduced();

    const pool = [...session.groups.flatMap((g) => g.members), ...(session.unassigned || [])];

    // ── Spin phase: slot-machine, slowing down with ticks
    spinner.classList.remove('revealed', 'slam');
    spinner.classList.add('spinning');
    membersEl.innerHTML = '';
    name.classList.remove('is-group');
    flavor.textContent = `Group ${idx + 1}: ${pickOne(SPIN_LINES)}`;

    const total = (reduced ? 350 : 2300) * speedMul();
    let t = 0, i = 0, interval = 50;
    while (t < total) {
      const p = pickOne(pool);
      name.textContent = p.name;
      roll.textContent = p.roll;
      mascot.textContent = pickOne(MASCOTS);
      name.style.transform = `translateY(${(Math.random() - 0.5) * 6}px) rotate(${(Math.random() - 0.5) * 2.4}deg)`;
      FX.tick(i++);
      await wait(interval, runId);
      t += interval;
      interval = Math.min(300, interval * 1.1);
    }
    name.style.transform = '';

    // ── Slam reveal
    spinner.classList.remove('spinning');
    spinner.classList.add('revealed');
    retrigger(spinner, 'slam');
    FX.whoosh();
    await wait(reduced ? 20 : 160, runId);
    FX.boom();
    FX.ding();

    mascot.textContent = pickOne(['🎉', '🥳', '🎊', '🏆', '🤩', '😎']);
    name.classList.add('is-group');
    name.textContent = group.groupName;
    roll.textContent = group.topic ? `📚 ${group.topic.title}` : '';
    flavor.textContent = pickOne(REVEAL_LINES);

    const stagger = reduced ? 0.05 : 0.3;
    membersEl.innerHTML = group.members.map((m, k) => `
      <div class="spin-member" style="--d:${(k * stagger).toFixed(2)}s">
        <span class="sm-name">${escapeHtml(m.name)}</span>
        <small class="sm-roll">${escapeHtml(m.roll)}</small>
      </div>`).join('');
    group.members.forEach((_, k) => FX.pop(0.15 + k * stagger));

    const rect = spinner.getBoundingClientRect();
    Confetti.burst(rect.left + rect.width / 2, rect.top + rect.height * 0.35, 70);
    revealGroup(group, idx);

    await wait((reduced ? 250 : 1100 + group.members.length * 320) * Math.max(0.6, speedMul()), runId);
  }

  function revealGroup(group, idx) {
    lotteryState.revealedGroups.push(group);
    const total = lotteryState.session.groups.length;
    $('progress-fill').style.width = ((idx + 1) / total) * 100 + '%';
    $('progress-text').textContent = `${idx + 1} / ${total} groups`;
    const chip = document.createElement('div');
    chip.className = 'lottery-group-chip';
    chip.textContent = `${group.groupName} (${group.members.length})`;
    $('lottery-groups-preview').appendChild(chip);
  }

  function togglePauseDraw() {
    const btn = $('btn-pause-draw');
    if (!lotteryState || !btn) return;
    if (lotteryState.phase === 'spinning' || lotteryState.phase === 'countdown') {
      lotteryState.resumePhase = lotteryState.phase;
      lotteryState.phase = 'paused';
      $('lottery-spinner').classList.add('is-paused');
      btn.innerHTML = '<i data-lucide="play"></i> Resume';
      FX.boing();
    } else if (lotteryState.phase === 'paused') {
      lotteryState.phase = lotteryState.resumePhase || 'spinning';
      $('lottery-spinner').classList.remove('is-paused');
      btn.innerHTML = '<i data-lucide="pause"></i> Pause';
      FX.pop();
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function revealAllGroups() {
    if (!lotteryState) return;
    lotteryState.runId++; // cancels the running animation
    const groups = lotteryState.session.groups;
    for (let i = lotteryState.revealedGroups.length; i < groups.length; i++) {
      revealGroup(groups[i], i);
    }
    $('lottery-spinner').classList.remove('spinning', 'countdown', 'is-paused');
    finishAnimation();
  }

  function finishAnimation() {
    lotteryState.phase = 'done';
    const session = lotteryState.session;
    const spinner = $('lottery-spinner');
    spinner.classList.remove('spinning', 'revealed', 'countdown', 'is-paused');
    $('btn-pause-draw').hidden = true;
    $('btn-reveal-all').hidden = true;
    const start = $('btn-start-draw');
    start.hidden = false;
    start.innerHTML = '<i data-lucide="check"></i> Save & View Results';
    start.onclick = finishLottery;

    $('spin-mascot').textContent = '🏆';
    const name = $('spin-name');
    name.classList.remove('is-group', 'is-go');
    name.textContent = 'Draw Complete!';
    retrigger(name, 'count-pop');
    const un = (session.unassigned || []).length;
    $('spin-roll').textContent = `${session.groups.length} groups formed` + (un ? ` · ${un} unassigned` : '');
    $('spin-members').innerHTML = '';
    $('spin-flavor').textContent = 'May the best presentation win 🎤';
    lotteryOverlay.classList.add('celebrate');
    FX.fanfare();
    Confetti.rain(isReduced() ? 0 : 160);
    const r = spinner.getBoundingClientRect();
    Confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 120, 1.3);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function finishLottery() {
    if (!lotteryState) return;
    lotteryState.runId++;
    state.sessions.push(lotteryState.session);
    state._viewSessionId = lotteryState.session.id;
    persist();
    closeLotteryOverlay();
    lotteryState = null;
    toast('Lottery saved successfully', 'success');
    renderView('results');
  }

  // ─── Results ─────────────────────────────────────────────
  function renderResults() {
    const sessionId = state._viewSessionId || (state.sessions.length ? state.sessions[state.sessions.length - 1].id : null);
    const session = state.sessions.find((s) => s.id === sessionId);

    if (!session) {
      main.innerHTML = `
        <div class="empty-state">
          <i data-lucide="clipboard-list"></i>
          <h3>No results yet</h3>
          <p>Run a lottery to generate presentation groups.</p>
          <button class="btn btn-primary" style="margin-top:1rem" id="goto-lottery">Create Lottery</button>
        </div>
      `;
      main.querySelector('#goto-lottery')?.addEventListener('click', () => renderView('lottery'));
      return;
    }

    const assigned = session.groups.reduce((n, g) => n + g.members.length, 0);
    const unassigned = session.unassigned || [];

    main.innerHTML = `
      <div class="section-header">
        <div>
          <h2>${escapeHtml(session.title)}</h2>
          <p class="form-hint">${formatDateTime(session.createdAt)} · ID: ${escapeHtml(session.id.slice(-10))}
            ${session.locked ? ' · <span class="badge badge-warning">Locked</span>' : ''}
          </p>
        </div>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" id="btn-copy-results"><i data-lucide="copy"></i>Copy</button>
          <button class="btn btn-secondary btn-sm" id="btn-export-csv"><i data-lucide="file-spreadsheet"></i>CSV</button>
          <button class="btn btn-secondary btn-sm" id="btn-export-pdf"><i data-lucide="file-text"></i>PDF</button>
          <button class="btn btn-secondary btn-sm" id="btn-print"><i data-lucide="printer"></i>Print</button>
          <button class="btn btn-secondary btn-sm" id="btn-toggle-lock">${session.locked ? '<i data-lucide="unlock"></i>Unlock' : '<i data-lucide="lock"></i>Lock'}</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card primary"><div class="stat-label">Groups</div><div class="stat-value">${session.groups.length}</div></div>
        <div class="stat-card success"><div class="stat-label">Assigned</div><div class="stat-value">${assigned}</div></div>
        <div class="stat-card warning"><div class="stat-label">Unassigned</div><div class="stat-value">${unassigned.length}</div></div>
        <div class="stat-card"><div class="stat-label">Group Size</div><div class="stat-value">${session.groupSize}</div></div>
      </div>

      <div class="groups-grid" id="results-groups">
        ${session.groups.map((g) => `
          <div class="group-card">
            <div class="group-card-header">
              <h3>${escapeHtml(g.groupName)}</h3>
              <div class="group-card-topic">${g.topic ? escapeHtml(g.topic.title) : 'No topic assigned'}</div>
            </div>
            <div class="group-card-body">
              ${g.members.map((m) => `
                <div class="group-member">
                  <span>${escapeHtml(m.name)}</span>
                  <span class="member-roll">${escapeHtml(m.roll)}</span>
                </div>
              `).join('')}
              <div class="form-hint" style="margin-top:0.5rem">${g.members.length} members</div>
            </div>
          </div>
        `).join('')}
      </div>

      ${unassigned.length ? `
        <div class="card" style="margin-top:1.5rem">
          <div class="card-header"><h3 class="card-title">Unassigned Students</h3></div>
          <div class="card-body">
            ${unassigned.map((m) => `<div class="group-member"><span>${escapeHtml(m.name)}</span><span class="member-roll">${escapeHtml(m.roll)}</span></div>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="card" style="margin-top:1.5rem">
        <div class="card-header"><h3 class="card-title">Results Table</h3></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Group</th><th>Topic</th><th>Roll</th><th>Name</th></tr>
            </thead>
            <tbody>
              ${session.groups.flatMap((g) =>
                g.members.map((m) => `
                  <tr>
                    <td>${escapeHtml(g.groupName)}</td>
                    <td>${g.topic ? escapeHtml(g.topic.title) : '—'}</td>
                    <td><code>${escapeHtml(m.roll)}</code></td>
                    <td>${escapeHtml(m.name)}</td>
                  </tr>
                `)
              ).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    main.querySelector('#btn-copy-results')?.addEventListener('click', () => copyResults(session));
    main.querySelector('#btn-export-csv')?.addEventListener('click', () => exportResultsCSV(session));
    main.querySelector('#btn-export-pdf')?.addEventListener('click', () => exportResultsPDF(session));
    main.querySelector('#btn-print')?.addEventListener('click', () => window.print());
    main.querySelector('#btn-toggle-lock')?.addEventListener('click', () => {
      if (session.locked) {
        confirmDialog('Unlock Results', 'Allow editing of this session?', () => {
          session.locked = false;
          session.history.push({ action: 'unlocked', at: new Date().toISOString() });
          persist();
          renderResults();
        });
      } else {
        session.locked = true;
        session.history.push({ action: 'locked', at: new Date().toISOString() });
        persist();
        toast('Results locked', 'success');
        renderResults();
      }
    });
  }

  function copyResults(session) {
    let text = `${session.title}\n${formatDateTime(session.createdAt)}\n\n`;
    session.groups.forEach((g) => {
      text += `${g.groupName}${g.topic ? ' — ' + g.topic.title : ''}\n`;
      g.members.forEach((m) => { text += `  ${m.roll}\t${m.name}\n`; });
      text += '\n';
    });
    if (session.unassigned?.length) {
      text += 'Unassigned:\n';
      session.unassigned.forEach((m) => { text += `  ${m.roll}\t${m.name}\n`; });
    }
    navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard', 'success'))
      .catch(() => toast('Copy failed', 'error'));
  }

  function exportResultsCSV(session) {
    const rows = [['Group', 'Topic', 'Roll', 'Name']];
    session.groups.forEach((g) => {
      g.members.forEach((m) => {
        rows.push([g.groupName, g.topic?.title || '', m.roll, m.name]);
      });
    });
    (session.unassigned || []).forEach((m) => {
      rows.push(['Unassigned', '', m.roll, m.name]);
    });
    downloadCSV(rows, `results_${session.id.slice(-8)}.csv`);
    toast('CSV exported', 'success');
  }

  function exportResultsPDF(session) {
    if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
      toast('PDF library not loaded. Use Print → Save as PDF instead.', 'error');
      return;
    }
    try {
      const { jsPDF } = window.jspdf || window;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const settings = state.settings;
      let y = 18;

      doc.setFontSize(16);
      doc.text(settings.universityName || 'University', 105, y, { align: 'center' });
      y += 7;
      doc.setFontSize(12);
      doc.text(settings.departmentName || '', 105, y, { align: 'center' });
      y += 10;
      doc.setFontSize(14);
      doc.text(session.title, 105, y, { align: 'center' });
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${formatDateTime(session.createdAt)}`, 105, y, { align: 'center' });
      if (session.semester || session.section) {
        y += 5;
        doc.text(`Semester: ${session.semester || '—'}  ·  Section: ${session.section || '—'}`, 105, y, { align: 'center' });
      }
      doc.setTextColor(0);
      y += 10;

      session.groups.forEach((g) => {
        if (y > 260) { doc.addPage(); y = 18; }
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${g.groupName}${g.topic ? ' — ' + g.topic.title : ''}`, 14, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        g.members.forEach((m) => {
          if (y > 275) { doc.addPage(); y = 18; }
          doc.text(`${m.roll}    ${m.name}`, 18, y);
          y += 5;
        });
        y += 4;
      });

      if (session.unassigned?.length) {
        if (y > 250) { doc.addPage(); y = 18; }
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Unassigned Students', 14, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        session.unassigned.forEach((m) => {
          doc.text(`${m.roll}    ${m.name}`, 18, y);
          y += 5;
        });
      }

      y += 8;
      if (y > 270) { doc.addPage(); y = 18; }
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(settings.reportFooter || 'Generated by GroupDraw', 105, y, { align: 'center' });
      doc.text(`Made by Mahfujur Alam Reemu`, 105, y + 5, { align: 'center' });

      doc.save(`GroupDraw_${session.id.slice(-8)}.pdf`);
      toast('PDF downloaded', 'success');
    } catch (err) {
      console.error(err);
      toast('PDF export failed. Try Print → Save as PDF.', 'error');
    }
  }

  // ─── History ─────────────────────────────────────────────
  function renderHistory() {
    main.innerHTML = `
      <div class="section-header">
        <h2>Session History (${state.sessions.length})</h2>
      </div>
      <div class="card">
        ${state.sessions.length === 0
          ? `<div class="empty-state"><i data-lucide="history"></i><h3>No sessions</h3></div>`
          : state.sessions.slice().reverse().map((s) => `
            <div class="history-item">
              <div>
                <strong>${escapeHtml(s.title)}</strong>
                <div class="history-meta">
                  ${formatDateTime(s.createdAt)} · ${s.groups.length} groups ·
                  ${s.groups.reduce((n, g) => n + g.members.length, 0)} assigned
                  ${s.locked ? ' · Locked' : ''}
                </div>
              </div>
              <div class="card-actions">
                <button class="btn btn-sm btn-secondary" data-open-ses="${escapeHtml(s.id)}">Open</button>
                <button class="btn btn-sm btn-ghost" data-rename-ses="${escapeHtml(s.id)}">Rename</button>
                <button class="btn btn-sm btn-ghost" data-dup-ses="${escapeHtml(s.id)}">Duplicate Config</button>
                <button class="btn btn-sm btn-ghost" data-del-ses="${escapeHtml(s.id)}" style="color:var(--danger)">Delete</button>
              </div>
            </div>
          `).join('')
        }
      </div>
    `;

    main.querySelectorAll('[data-open-ses]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state._viewSessionId = btn.dataset.openSes;
        renderView('results');
      });
    });
    main.querySelectorAll('[data-rename-ses]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = state.sessions.find((x) => x.id === btn.dataset.renameSes);
        if (!s) return;
        openModal(`
          <div class="modal-header"><h3>Rename Session</h3><button class="btn-icon" data-close-modal><i data-lucide="x"></i></button></div>
          <div class="modal-body">
            <input class="form-input" id="rename-input" value="${escapeHtml(s.title)}" />
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-close-modal>Cancel</button>
            <button class="btn btn-primary" id="do-rename">Save</button>
          </div>
        `);
        document.getElementById('do-rename')?.addEventListener('click', () => {
          s.title = document.getElementById('rename-input').value.trim() || s.title;
          persist();
          closeModal();
          renderHistory();
        });
      });
    });
    main.querySelectorAll('[data-dup-ses]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = state.sessions.find((x) => x.id === btn.dataset.dupSes);
        if (!s) return;
        // Pre-fill wizard from session config
        wizardData = {
          step: 1,
          semester: s.semester || '',
          section: s.section || '',
          selectedStudentIds: s.groups.flatMap((g) => g.members.map((m) => m.id)).filter(Boolean),
          selectedTopicIds: [],
          groupSize: s.groupSize || 4,
          customSize: '',
          leftoverPolicy: s.leftoverPolicy || 'smaller',
          topicMode: s.topicMode || 'different',
          speed: 'normal',
          sessionTitle: (s.title || 'Session') + ' (copy)',
        };
        // Fallback: match by roll if ids missing
        if (wizardData.selectedStudentIds.length === 0) {
          const rolls = new Set(s.groups.flatMap((g) => g.members.map((m) => m.roll)));
          wizardData.selectedStudentIds = state.students.filter((st) => rolls.has(st.roll)).map((st) => st.id);
        }
        currentView = 'lottery';
        setActiveNav('lottery');
        pageTitle.textContent = 'Lottery Setup';
        renderWizard();
        toast('Configuration loaded — review and start', 'info');
      });
    });
    main.querySelectorAll('[data-del-ses]').forEach((btn) => {
      btn.addEventListener('click', () => {
        confirmDialog('Delete Session', 'Permanently delete this lottery session?', () => {
          state.sessions = state.sessions.filter((x) => x.id !== btn.dataset.delSes);
          if (state._viewSessionId === btn.dataset.delSes) state._viewSessionId = null;
          persist();
          toast('Session deleted', 'success');
          renderHistory();
        });
      });
    });
  }

  // ─── Settings ────────────────────────────────────────────
  function renderSettings() {
    const s = state.settings;
    main.innerHTML = `
      <div class="card" style="max-width:640px">
        <div class="card-body">
          <h3 style="margin-bottom:1rem">Institution</h3>
          <div class="form-group">
            <label class="form-label">University Name</label>
            <input class="form-input" id="set-uni" value="${escapeHtml(s.universityName)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Department Name</label>
            <input class="form-input" id="set-dept" value="${escapeHtml(s.departmentName)}" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Default Semester</label>
              <input class="form-input" id="set-sem" value="${escapeHtml(s.defaultSemester)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Default Section</label>
              <input class="form-input" id="set-sec" value="${escapeHtml(s.defaultSection)}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Default Group Size</label>
            <input class="form-input" type="number" min="1" max="20" id="set-gsize" value="${s.defaultGroupSize}" style="max-width:100px" />
          </div>

          <h3 style="margin:1.5rem 0 1rem">Preferences</h3>
          <div class="form-group">
            <label class="form-label">Theme</label>
            <select class="form-select" id="set-theme">
              <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option>
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label"><input type="checkbox" id="set-sound" ${s.soundEnabled ? 'checked' : ''} /> Enable sound effects</label>
          </div>
          <div class="form-group">
            <label class="checkbox-label"><input type="checkbox" id="set-motion" ${s.reducedMotion ? 'checked' : ''} /> Reduced motion</label>
          </div>

          <div class="form-group">
            <label class="form-label">Report Footer</label>
            <input class="form-input" id="set-footer" value="${escapeHtml(s.reportFooter)}" />
          </div>

          <div style="margin-top:1.5rem;display:flex;gap:0.5rem;flex-wrap:wrap">
            <button class="btn btn-primary" id="save-settings">Save Settings</button>
          </div>

          <h3 style="margin:2rem 0 1rem">Data Management</h3>
          <p class="form-hint" style="margin-bottom:1rem">
            Data is stored in this browser only (LocalStorage). Clearing site data will erase it.
            Export a JSON backup regularly.
          </p>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <button class="btn btn-secondary" id="btn-export-json"><i data-lucide="download"></i>Export Backup</button>
            <button class="btn btn-secondary" id="btn-import-json"><i data-lucide="upload"></i>Restore Backup</button>
            <button class="btn btn-danger" id="btn-clear-all"><i data-lucide="trash-2"></i>Clear All Data</button>
          </div>
          <input type="file" id="backup-file" accept=".json" hidden />
        </div>
      </div>
    `;

    main.querySelector('#save-settings')?.addEventListener('click', () => {
      state.settings.universityName = document.getElementById('set-uni').value.trim();
      state.settings.departmentName = document.getElementById('set-dept').value.trim();
      state.settings.defaultSemester = document.getElementById('set-sem').value.trim();
      state.settings.defaultSection = document.getElementById('set-sec').value.trim();
      state.settings.defaultGroupSize = parseInt(document.getElementById('set-gsize').value, 10) || 4;
      state.settings.theme = document.getElementById('set-theme').value;
      state.settings.soundEnabled = document.getElementById('set-sound').checked;
      state.settings.reducedMotion = document.getElementById('set-motion').checked;
      state.settings.reportFooter = document.getElementById('set-footer').value.trim();
      applyTheme(state.settings.theme);
      persist();
      toast('Settings saved', 'success');
    });

    main.querySelector('#btn-export-json')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `groupdraw_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Backup exported', 'success');
    });

    main.querySelector('#btn-import-json')?.addEventListener('click', () => {
      document.getElementById('backup-file').click();
    });
    main.querySelector('#backup-file')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data || !Array.isArray(data.students)) {
          toast('Invalid backup file', 'error');
          return;
        }
        confirmDialog('Restore Backup', 'This will replace all current data. Continue?', () => {
          state = {
            version: data.version || APP_VERSION,
            students: data.students || [],
            topics: data.topics || [],
            sessions: data.sessions || [],
            settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
          };
          persist();
          applyTheme(state.settings.theme);
          toast('Backup restored', 'success');
          renderView('dashboard');
        });
      } catch {
        toast('Failed to read backup', 'error');
      }
    });

    main.querySelector('#btn-clear-all')?.addEventListener('click', () => {
      confirmDialog('Clear All Data', 'This permanently deletes all students, topics, and sessions in this browser. Continue?', () => {
        state = structuredClone(DEFAULT_DATA);
        persist();
        applyTheme(state.settings.theme);
        toast('All data cleared', 'success');
        renderView('dashboard');
      });
    });
  }

  // ─── Utilities ───────────────────────────────────────────
  function downloadCSV(rows, filename) {
    const csv = rows.map((r) =>
      r.map((c) => {
        const s = String(c ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(',')
    ).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function bindGlobalEvents() {
    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !e.target.closest('#menu-toggle')) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ─── Boot ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();