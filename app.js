const STORAGE_KEY = "runpro-coach-state-v1";
const GARMIN_BACKEND_BASE = (() => {
  if (window.RUNPRO_GARMIN_API) return String(window.RUNPRO_GARMIN_API).replace(/\/$/, "");
  const origin = window.location.origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return "http://localhost:8787";
  return origin;
})();
let supabaseUrl = window.RUNPRO_SUPABASE_URL || "";
let supabaseAnonKey = window.RUNPRO_SUPABASE_ANON_KEY || "";
const SUPABASE_STATE_TABLE = "user_states";

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const fullDayNames = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

const zoneDefs = [
  { key: "easy", label: "Leve", color: "#1f9d8a", offset: [75, 115], note: "Aerobico facil, conversa normal" },
  { key: "long", label: "Longao", color: "#5aa05a", offset: [85, 130], note: "Resistencia, controlado do inicio ao fim" },
  { key: "steady", label: "Moderado", color: "#e7aa2f", offset: [45, 70], note: "Ritmo firme, ainda sustentavel" },
  { key: "threshold", label: "Limiar", color: "#f26b4f", offset: [20, 35], note: "Forte controlado, frases curtas" },
  { key: "interval", label: "Intervalado", color: "#2f5bea", offset: [-5, 10], note: "Tiros de 400 m a 1 km" },
  { key: "rep", label: "Repeticao", color: "#6f45bc", offset: [-20, -8], note: "Rapido, tecnico, recuperacao completa" },
];

const trainingLibraryDefs = [
  { type: "recovery", label: "Recovery", purpose: "Recuperar sem parar totalmente", source: "Garmin: facil, relaxado e curto" },
  { type: "easy", label: "Base leve", purpose: "Construir volume aerobico com baixo estresse", source: "Garmin Coach: maior parte do volume" },
  { type: "long", label: "Longao", purpose: "Resistencia, economia e tempo em pe", source: "Garmin Full Potential: conversa confortavel" },
  { type: "tempo", label: "Limiar/tempo", purpose: "Sustentar ritmo forte controlado", source: "Garmin: lactato e endurance de velocidade" },
  { type: "interval", label: "Tiro/intervalado", purpose: "Ritmo especifico, VO2 e velocidade", source: "Garmin: repeticoes com recuperacao" },
  { type: "fartlek", label: "Fartlek", purpose: "Variar ritmo por sensacao e terreno", source: "Garmin: speed play" },
  { type: "hill", label: "Subida", purpose: "Forca de corrida e economia", source: "Garmin: hill training" },
  { type: "progression", label: "Progressivo", purpose: "Controle de ritmo e final forte", source: "Uso em polimento e longos" },
  { type: "racepace", label: "Ritmo de prova", purpose: "Ensaiar o alvo da prova cadastrada", source: "Garmin: race pace practice" },
  { type: "race", label: "Prova", purpose: "Evento alvo ou preparatorio", source: "Calendario do atleta" },
  { type: "strength", label: "Forca/core", purpose: "Condicionamento complementar", source: "Garmin: body conditioning" },
  { type: "rest", label: "Descanso", purpose: "Absorver carga e reduzir risco", source: "Garmin: rest and recovery" },
];

const iconPaths = {
  dashboard: '<rect x="3" y="3" width="7" height="8" rx="1.5"></rect><rect x="14" y="3" width="7" height="5" rx="1.5"></rect><rect x="14" y="12" width="7" height="9" rx="1.5"></rect><rect x="3" y="15" width="7" height="6" rx="1.5"></rect>',
  check: '<path d="M20 6 9 17l-5-5"></path>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>',
  timer: '<path d="M10 2h4"></path><path d="M12 14l3-3"></path><circle cx="12" cy="14" r="8"></circle>',
  calendar: '<path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M3 10h18"></path>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>',
  watch: '<circle cx="12" cy="12" r="5"></circle><path d="M9 1h6l1 4H8l1-4Z"></path><path d="M8 19h8l-1 4H9l-1-4Z"></path><path d="M12 9v3l2 1"></path>',
  flag: '<path d="M5 22V3"></path><path d="M5 3h12l-1.5 4L17 11H5"></path>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"></path><path d="M3 21v-5h5"></path><path d="M3 12A9 9 0 0 1 18.5 5.7L21 8"></path><path d="M21 3v5h-5"></path>',
  spark: '<path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2Z"></path><path d="M19 15l.8 2.7 2.7.8-2.7.8L19 23l-.8-2.7-2.7-.8 2.7-.8L19 15Z"></path>',
  arrow: '<path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M17 21v-8H7v8"></path><path d="M7 3v5h8"></path>',
  calculator: '<rect x="4" y="2" width="16" height="20" rx="2"></rect><path d="M8 6h8"></path><path d="M8 10h.01"></path><path d="M12 10h.01"></path><path d="M16 10h.01"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path>',
  download: '<path d="M12 3v12"></path><path d="M7 10l5 5 5-5"></path><path d="M5 21h14"></path>',
  upload: '<path d="M12 21V9"></path><path d="M7 14l5-5 5 5"></path><path d="M5 3h14"></path>',
  unlink: '<path d="M17 7h1a5 5 0 0 1 0 10h-3"></path><path d="M7 17H6A5 5 0 0 1 6 7h3"></path><path d="M8 12h8"></path><path d="M3 3l18 18"></path>',
};

const defaultState = {
  profile: null,
  test: null,
  plan: [],
  logs: [],
  races: [],
  cycle: { number: 1, startDate: null, previousSummary: null },
  garminConnected: false,
  garminMode: "simulated",
  imports: [],
};

let state = loadState();
let supabaseClient = null;
let currentUser = null;
let authMode = "signin";
let saveTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  hydrateIcons();
  setDefaultDates();
  bindNavigation();
  bindForms();
  bindAuth();
  bindGarmin();
  renderAll();
  initAuthAndLoadState();
});

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(localStateKey()));
    return { ...defaultState, ...parsed };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(localStateKey(), JSON.stringify(state));
  queueRemoteStateSave();
}

function localStateKey(userId = currentUser?.id || "anon") {
  return `${STORAGE_KEY}:${userId}`;
}

function garminUserId() {
  return currentUser?.id || "local-athlete";
}

function hydrateIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    const name = node.dataset.icon;
    node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || ""}</svg>`;
  });
}

function setDefaultDates() {
  const today = toISODate(new Date());
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = today;
  });
}

function bindAuth() {
  const dialog = document.getElementById("authDialog");
  const close = document.getElementById("authDialogClose");
  const signInBtn = document.getElementById("signInBtn");
  const signUpBtn = document.getElementById("signUpBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const form = document.getElementById("authForm");

  close.addEventListener("click", () => dialog.close());
  signInBtn.addEventListener("click", () => openAuthDialog("signin"));
  signUpBtn.addEventListener("click", () => openAuthDialog("signup"));
  signOutBtn.addEventListener("click", async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    currentUser = null;
    state = loadState();
    renderAll();
    renderAuthStrip();
    syncGarminConnection();
    showToast("Sessao encerrada.");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) {
      showToast("Supabase nao configurado. Rode em modo local ou configure variaveis.");
      return;
    }
    const data = new FormData(form);
    const email = String(data.get("authEmail") || "").trim();
    const password = String(data.get("authPassword") || "");
    if (!email || !password) return;

    if (authMode === "signup") {
      const { error } = await supabaseClient.auth.signUp({ email, password });
      if (error) return showToast(`Cadastro falhou: ${error.message}`);
      showToast("Conta criada. Verifique seu email para confirmar.");
      dialog.close();
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return showToast(`Login falhou: ${error.message}`);
    dialog.close();
    showToast("Login realizado.");
  });
}

function openAuthDialog(mode) {
  authMode = mode;
  const dialog = document.getElementById("authDialog");
  const title = document.getElementById("authDialogTitle");
  const submit = document.getElementById("authSubmitBtn");
  title.textContent = mode === "signup" ? "Criar conta" : "Entrar";
  submit.textContent = mode === "signup" ? "Criar conta" : "Entrar";
  dialog.showModal();
}

async function initAuthAndLoadState() {
  await hydratePublicConfig();
  const SupabaseGlobal = window.supabase;
  if (supabaseUrl && supabaseAnonKey && SupabaseGlobal?.createClient) {
    supabaseClient = SupabaseGlobal.createClient(supabaseUrl, supabaseAnonKey);
    const { data } = await supabaseClient.auth.getSession();
    currentUser = data?.session?.user || null;
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      await hydrateStateFromSources();
      renderAuthStrip();
      renderAll();
      syncGarminConnection();
    });
  }
  await hydrateStateFromSources();
  renderAuthStrip();
  renderAll();
  syncGarminConnection();
}

async function hydratePublicConfig() {
  if (supabaseUrl && supabaseAnonKey) return;
  try {
    const response = await fetch(`${GARMIN_BACKEND_BASE}/api/public-config`);
    if (!response.ok) return;
    const payload = await response.json();
    supabaseUrl = payload.supabase_url || supabaseUrl;
    supabaseAnonKey = payload.supabase_anon_key || supabaseAnonKey;
  } catch {
    // No-op: app remains usable in local-only mode.
  }
}

async function hydrateStateFromSources() {
  state = loadState();
  if (!supabaseClient || !currentUser) return;
  try {
    const { data, error } = await supabaseClient
      .from(SUPABASE_STATE_TABLE)
      .select("app_state")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    if (error) throw error;
    if (data?.app_state) {
      state = { ...defaultState, ...data.app_state };
      localStorage.setItem(localStateKey(currentUser.id), JSON.stringify(state));
    }
  } catch {
    showToast("Nao consegui carregar dados na nuvem. Seguindo com cache local.");
  }
}

function queueRemoteStateSave() {
  if (!supabaseClient || !currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const payload = {
        user_id: currentUser.id,
        app_state: state,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabaseClient.from(SUPABASE_STATE_TABLE).upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    } catch {
      // Keep local flow resilient if remote persistence fails.
    }
  }, 350);
}

function renderAuthStrip() {
  const identity = document.getElementById("authIdentity");
  const signInBtn = document.getElementById("signInBtn");
  const signUpBtn = document.getElementById("signUpBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const connected = Boolean(currentUser?.email);
  identity.textContent = connected ? currentUser.email : "Visitante";
  signInBtn.classList.toggle("hidden", connected);
  signUpBtn.classList.toggle("hidden", connected);
  signOutBtn.classList.toggle("hidden", !connected);
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.jump));
  });

  document.getElementById("resetApp").addEventListener("click", () => {
    if (!confirm("Reiniciar todos os dados salvos neste navegador?")) return;
    state = structuredClone(defaultState);
    saveState();
    renderAll();
    hydrateProfileForm();
    showToast("Dados reiniciados.");
  });
}

function bindForms() {
  const profileForm = document.getElementById("profileForm");
  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(profileForm);
    const selectedDays = data.getAll("days").map(Number).sort((a, b) => a - b);
    const days = selectedDays.length ? selectedDays : [2, 4, 6];
    const weeklyKm = Number(data.get("weeklyKm")) || inferWeeklyKm(data.get("currentDistance"), days.length);
    const longRunKm = Number(data.get("longRunKm")) || Math.max(4, Math.round(weeklyKm * 0.32));

    state.profile = {
      name: data.get("name").trim() || "Atleta",
      weightKg: Number(data.get("weightKg")) || null,
      goalDistance: data.get("goalDistance"),
      currentDistance: data.get("currentDistance"),
      weeklyKm,
      longRunKm,
      level: data.get("level"),
      days,
      startDate: data.get("startDate") || toISODate(new Date()),
      risk: data.get("risk"),
      longRunDay: data.get("longRunDay"),
    };
    state.cycle = {
      ...(state.cycle || { number: 1 }),
      startDate: state.profile.startDate,
    };
    state.plan = state.test ? generatePlan(state.profile, state.test, state.logs, state.races) : [];
    saveState();
    renderAll();
    showView("test");
    showToast(state.test ? "Cadastro salvo. Planilha mensal atualizada." : "Cadastro salvo. Agora faca o teste de 3 km.");
  });

  document.getElementById("sampleAthlete").addEventListener("click", () => {
    profileForm.elements.name.value = "Vitor";
    profileForm.elements.weightKg.value = 74;
    profileForm.elements.goalDistance.value = "10K";
    profileForm.elements.currentDistance.value = "5-10";
    profileForm.elements.weeklyKm.value = 24;
    profileForm.elements.longRunKm.value = 8;
    profileForm.elements.level.value = "intermediario";
    profileForm.elements.startDate.value = toISODate(new Date());
    profileForm.elements.risk.value = "normal";
    profileForm.elements.longRunDay.value = "6";
    profileForm.querySelectorAll('[name="days"]').forEach((input) => {
      input.checked = ["2", "4", "6", "0"].includes(input.value);
    });
    showToast("Exemplo preenchido.");
  });

  const testForm = document.getElementById("testForm");
  testForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(testForm);
    const totalSeconds = parseTime(data.get("testTime"));
    if (!totalSeconds || totalSeconds < 420 || totalSeconds > 2400) {
      showToast("Informe o tempo do 3 km no formato mm:ss. Ex.: 14:30");
      return;
    }

    state.test = {
      date: data.get("testDate") || toISODate(new Date()),
      totalSeconds,
      paceSeconds: Math.round(totalSeconds / 3),
      avgHr: Number(data.get("avgHr")) || null,
      rpe: Number(data.get("rpe")) || 8,
    };

    if (state.profile) {
      state.cycle = {
        ...(state.cycle || { number: 1 }),
        startDate: state.profile.startDate,
      };
      state.plan = generatePlan(state.profile, state.test, state.logs, state.races);
    }
    saveState();
    renderAll();
    if (state.profile) showView("plan");
    showToast(state.profile ? "Teste salvo. Planilha mensal gerada." : "Teste salvo. Complete o cadastro para gerar a planilha.");
  });

  document.getElementById("regeneratePlan").addEventListener("click", () => {
    if (!state.profile) {
      showToast("Configure o perfil antes de gerar o plano.");
      showView("onboarding");
      return;
    }
    if (!state.test) {
      showToast("Faça o teste de 3 km antes de gerar a planilha.");
      showView("test");
      return;
    }
    state.plan = generatePlan(state.profile, state.test, state.logs, state.races);
    saveState();
    renderAll();
    showToast("Plano regerado com os dados atuais.");
  });

  document.getElementById("finishCycle").addEventListener("click", () => {
    if (!state.profile || !state.test || !state.plan.length) {
      showToast("Complete cadastro, teste de 3 km e planilha atual antes de fechar o mes.");
      return;
    }
    finishCurrentCycle();
    saveState();
    renderAll();
    showView("plan");
    showToast("Novo ciclo mensal criado com base no mes anterior.");
  });

  document.getElementById("exportPlan").addEventListener("click", () => {
    if (!state.plan.length) {
      showToast("Gere um plano antes de exportar.");
      return;
    }
    downloadFile("runpro-planilha-mensal.json", JSON.stringify(state.plan, null, 2), "application/json");
  });

  const logForm = document.getElementById("logForm");
  logForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(logForm);
    const durationSeconds = parseTime(data.get("duration"));
    const workoutId = data.get("workoutId");
    const planned = state.plan.find((item) => item.id === workoutId);
    const log = {
      id: crypto.randomUUID(),
      workoutId,
      plannedTitle: planned?.title || "Treino avulso",
      date: data.get("logDate") || toISODate(new Date()),
      distance: Number(data.get("distance")) || planned?.distance || 0,
      durationSeconds: durationSeconds || null,
      effort: Number(data.get("effort")) || 5,
      feeling: data.get("feeling"),
      notes: data.get("notes").trim(),
      source: "manual",
    };

    state.logs.unshift(log);
    adaptPlanAfterLog(log);
    saveState();
    renderAll();
    logForm.reset();
    setDefaultDates();
    showToast("Treino registrado. O plano foi reavaliado.");
  });

  const raceForm = document.getElementById("raceForm");
  raceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(raceForm);
    const date = data.get("raceDate") || toISODate(new Date());
    const race = {
      id: crypto.randomUUID(),
      name: data.get("raceName").trim() || `Prova ${formatDate(date)}`,
      date,
      distance: Number(data.get("raceDistance")) || 10,
      priority: data.get("racePriority") || "A",
      goal: data.get("raceGoal").trim(),
    };
    state.races.push(race);
    state.races.sort((a, b) => parseISODate(a.date) - parseISODate(b.date));
    if (state.profile && state.test) {
      state.plan = generatePlan(state.profile, state.test, state.logs, state.races);
    }
    saveState();
    renderAll();
    raceForm.reset();
    setDefaultDates();
    showToast("Prova salva. Calendario de treinos ajustado.");
  });
}

function bindGarmin() {
  document.getElementById("connectGarmin").addEventListener("click", async () => {
    try {
      const probe = await fetch(`${GARMIN_BACKEND_BASE}/api/garmin/connect/availability`);
      const availability = await probe.json();
      if (!availability.ready) {
        showToast(`Backend Garmin incompleto. Falta: ${availability.missing.join(", ")}`);
        return;
      }
      const after = encodeURIComponent(window.location.href);
      const startUrl = `${GARMIN_BACKEND_BASE}/api/garmin/connect/start?user_id=${encodeURIComponent(garminUserId())}&redirect=1&after=${after}`;
      window.location.href = startUrl;
    } catch {
      showToast("Backend Garmin indisponivel. Suba o servidor em http://localhost:8787.");
    }
  });

  document.getElementById("disconnectGarmin").addEventListener("click", async () => {
    try {
      await fetch(`${GARMIN_BACKEND_BASE}/api/users/${encodeURIComponent(garminUserId())}/garmin`, {
        method: "DELETE",
      });
      state.garminConnected = false;
      state.garminMode = "simulated";
      saveState();
      renderAll();
      showToast("Garmin desconectado.");
    } catch {
      state.garminConnected = false;
      state.garminMode = "simulated";
      saveState();
      renderAll();
      showToast("Nao consegui confirmar com o backend, mas o status local foi resetado.");
    }
  });

  document.getElementById("activityImport").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const rows = file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseCsv(text);
      const items = Array.isArray(rows) ? rows : [rows];
      const importedLogs = items.map(normalizeImportedActivity).filter(Boolean);
      state.logs = [...importedLogs, ...state.logs];
      state.imports.unshift({
        id: crypto.randomUUID(),
        file: file.name,
        count: importedLogs.length,
        date: toISODate(new Date()),
      });
      saveState();
      renderAll();
      showToast(`${importedLogs.length} atividade(s) importada(s).`);
      event.target.value = "";
    } catch (error) {
      showToast("Nao consegui ler o arquivo. Confira as colunas ou o JSON.");
    }
  });

  document.getElementById("exportWorkoutJson").addEventListener("click", () => {
    const workout = selectedExportWorkout();
    if (!workout) return showToast("Escolha um treino para exportar.");
    downloadFile(`${slugify(workout.title)}.json`, JSON.stringify(toGarminWorkout(workout), null, 2), "application/json");
  });

  document.getElementById("exportWorkoutTcx").addEventListener("click", () => {
    const workout = selectedExportWorkout();
    if (!workout) return showToast("Escolha um treino para exportar.");
    downloadFile(`${slugify(workout.title)}.tcx`, toTcxWorkout(workout), "application/xml");
  });
}

async function syncGarminConnection() {
  try {
    const response = await fetch(`${GARMIN_BACKEND_BASE}/api/users/${encodeURIComponent(garminUserId())}/garmin`);
    if (!response.ok) throw new Error("status");
    const payload = await response.json();
    state.garminConnected = Boolean(payload.connected);
    state.garminMode = payload.connected ? "official" : "simulated";
    saveState();
    renderGarmin();
  } catch {
    renderGarmin();
  }
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === viewId));
  const titles = {
    dashboard: "Painel do atleta",
    onboarding: "Perfil e agenda",
    test: "Teste de 3 km",
    plan: "Plano de treino",
    races: "Calendario de provas",
    log: "Registro de treinos",
    garmin: "Garmin",
  };
  document.getElementById("pageTitle").textContent = titles[viewId] || "RunPro";
}

function renderAll() {
  hydrateProfileForm();
  hydrateTestForm();
  renderDashboard();
  renderZones();
  renderTestResult();
  renderPlan();
  renderTrainingLibrary();
  renderRaces();
  renderWorkoutSelectors();
  renderHistory();
  renderGarmin();
}

function hydrateProfileForm() {
  const form = document.getElementById("profileForm");
  if (!form) return;
  form.reset();
  setDefaultDates();
  if (!state.profile) {
    form.querySelectorAll('[name="days"]').forEach((input) => {
      input.checked = ["2", "4", "6"].includes(input.value);
    });
    return;
  }
  const profile = state.profile;
  form.elements.name.value = profile.name || "";
  form.elements.weightKg.value = profile.weightKg || "";
  form.elements.goalDistance.value = profile.goalDistance || "10K";
  form.elements.currentDistance.value = profile.currentDistance || "5-10";
  form.elements.weeklyKm.value = profile.weeklyKm || "";
  form.elements.longRunKm.value = profile.longRunKm || "";
  form.elements.level.value = profile.level || "intermediario";
  form.elements.startDate.value = profile.startDate || toISODate(new Date());
  form.elements.risk.value = profile.risk || "normal";
  form.elements.longRunDay.value = profile.longRunDay || "auto";
  form.querySelectorAll('[name="days"]').forEach((input) => {
    input.checked = profile.days?.includes(Number(input.value));
  });
}

function hydrateTestForm() {
  const form = document.getElementById("testForm");
  if (!form) return;
  if (!state.test) return;
  form.elements.testDate.value = state.test.date;
  form.elements.testTime.value = formatDuration(state.test.totalSeconds);
  form.elements.avgHr.value = state.test.avgHr || "";
  form.elements.rpe.value = state.test.rpe || 8;
}

function renderDashboard() {
  const profile = state.profile;
  const test = state.test;
  const stats = calculateStats();
  const next = findNextWorkout();

  document.getElementById("weeklyVolume").textContent = profile ? `${Math.round(profile.weeklyKm)} km` : "0 km";
  document.getElementById("volumeTrend").textContent = profile
    ? `${profile.days.length} dias/semana para ${goalLabel(profile.goalDistance)}${profile.weightKg ? ` - ${profile.weightKg} kg` : ""}`
    : "Configure seu perfil";
  document.getElementById("testPace").textContent = test ? `${formatPace(test.paceSeconds)}/km` : "--:--/km";
  document.getElementById("testAge").textContent = test ? `Teste em ${formatDate(test.date)}` : "Sem teste salvo";
  document.getElementById("adherence").textContent = `${stats.adherence}%`;
  document.getElementById("adherenceText").textContent = stats.done ? `${stats.done} de ${stats.due || state.logs.length} treinos` : "Sem treinos registrados";
  document.getElementById("loadStatus").textContent = stats.loadStatus;
  document.getElementById("loadAdvice").textContent = stats.loadAdvice;

  const heroHeadline = document.getElementById("heroHeadline");
  const heroText = document.getElementById("heroText");
  if (profile && test) {
    const nextRace = nextUpcomingRace();
    heroHeadline.textContent = `${profile.name}, seu ciclo mensal para ${goalLabel(profile.goalDistance)} esta ativo`;
    heroText.textContent = nextRace
      ? `Foco em ${nextRace.name} no dia ${formatDate(nextRace.date)}. A planilha ajusta carga, longos e polimento para chegar bem.`
      : `Plano com ${profile.days.length} treinos por semana, ritmos pelo teste de 3 km e ajustes pelo diario de execucao.`;
  } else if (profile) {
    heroHeadline.textContent = `Cadastro pronto para ${goalLabel(profile.goalDistance)}`;
    heroText.textContent = "Agora registre o teste de 3 km. A planilha mensal so nasce depois dele, com ritmos calculados pelo seu resultado.";
  } else {
    heroHeadline.textContent = "Monte seu plano com base no seu teste de 3 km";
    heroText.textContent = "Responda ao perfil, informe seus dias de treino e registre o teste para gerar semanas ajustadas ao seu ritmo real.";
  }

  const nextTitle = document.getElementById("nextWorkoutTitle");
  const nextBody = document.getElementById("nextWorkoutBody");
  if (!next) {
    nextTitle.textContent = "Nenhum treino gerado";
    nextBody.className = "workout-detail empty-state";
    nextBody.textContent = "Configure o atleta e gere um plano para ver a proxima sessao.";
    return;
  }
  nextTitle.textContent = `${next.dayName}, ${formatDate(next.date)} - ${next.title}`;
  nextBody.className = "workout-detail";
  nextBody.innerHTML = `
    <div class="workout-steps">
      <div class="workout-step"><strong>${next.distance.toFixed(1)} km</strong><span>${next.description}</span></div>
      <div class="workout-step"><strong>Alvo</strong><span>${next.target}</span></div>
      ${next.adaptation ? `<div class="workout-step"><strong>Ajuste</strong><span>${next.adaptation}</span></div>` : ""}
    </div>
  `;
}

function renderZones() {
  const container = document.getElementById("zonesList");
  const rows = zonesFromTest(state.test);
  container.innerHTML = rows
    .map(
      (zone) => `
      <div class="zone-row">
        <span class="zone-swatch" style="background:${zone.color}"></span>
        <div><strong>${zone.label}</strong><small>${zone.note}</small></div>
        <span>${zone.range}</span>
      </div>
    `,
    )
    .join("");
}

function renderTestResult() {
  const container = document.getElementById("testResult");
  if (!state.test) {
    container.className = "test-result empty-state";
    container.textContent = "Registre o tempo de 3 km para liberar as zonas.";
    return;
  }
  container.className = "test-result";
  const estimatedFive = estimateRaceTime(state.test.totalSeconds, 3, 5);
  const estimatedTen = estimateRaceTime(state.test.totalSeconds, 3, 10);
  container.innerHTML = `
    <div class="metric-card">
      <span>Tempo 3 km</span>
      <strong>${formatDuration(state.test.totalSeconds)}</strong>
      <small>Ritmo medio ${formatPace(state.test.paceSeconds)}/km</small>
    </div>
    <div class="metric-card">
      <span>Estimativa 5 km</span>
      <strong>${formatDuration(estimatedFive)}</strong>
      <small>Estimativa por formula de Riegel</small>
    </div>
    <div class="metric-card">
      <span>Estimativa 10 km</span>
      <strong>${formatDuration(estimatedTen)}</strong>
      <small>Use como referencia, nao como promessa</small>
    </div>
    ${zonesFromTest(state.test)
      .map(
        (zone) => `
          <div class="zone-row">
            <span class="zone-swatch" style="background:${zone.color}"></span>
            <div><strong>${zone.label}</strong><small>${zone.note}</small></div>
            <span>${zone.range}</span>
          </div>
        `,
      )
      .join("")}
  `;
}

function renderPlan() {
  const container = document.getElementById("planGrid");
  const cycleEyebrow = document.getElementById("cycleEyebrow");
  if (cycleEyebrow) {
    const number = state.cycle?.number || 1;
    const start = state.cycle?.startDate || state.profile?.startDate;
    cycleEyebrow.textContent = start ? `Ciclo mensal ${number} - inicio ${formatDate(start)}` : `Ciclo mensal ${number}`;
  }
  if (!state.plan.length) {
    const message = !state.profile
      ? "Complete o cadastro inicial para liberar o teste de 3 km."
      : !state.test
        ? "Faca o teste de 3 km para gerar a planilha mensal."
        : "Regenere a planilha mensal para ver o calendario.";
    container.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }
  const logsByWorkout = new Set(state.logs.map((log) => log.workoutId));
  const weeks = groupBy(state.plan, "week");
  container.innerHTML = Object.entries(weeks)
    .map(([week, workouts]) => {
      const volume = workouts.reduce((sum, item) => sum + item.distance, 0);
      return `
        <section class="week-column">
          <div class="week-title">
            <strong>Semana ${week}</strong>
            <span>${volume.toFixed(1)} km planejados</span>
          </div>
          ${workouts.map((workout) => planCard(workout, logsByWorkout.has(workout.id))).join("")}
        </section>
      `;
    })
    .join("");
}

function renderTrainingLibrary() {
  const container = document.getElementById("trainingLibrary");
  if (!container) return;
  const plannedTypes = new Set(state.plan.map((workout) => workout.type));
  container.innerHTML = trainingLibraryDefs
    .map(
      (item) => `
      <article class="library-card ${plannedTypes.has(item.type) ? "in-cycle" : ""}">
        <div>
          <span class="type-dot ${item.type}"></span>
          <strong>${item.label}</strong>
        </div>
        <p>${item.purpose}</p>
        <small>${item.source}</small>
      </article>
    `,
    )
    .join("");
}

function planCard(workout, done) {
  return `
    <article class="plan-card ${done ? "done" : ""} ${workout.type === "race" ? "race" : ""}">
      <header>
        <div>
          <small>${workout.dayName}, ${formatDate(workout.date)}</small>
          <h3>${workout.title}</h3>
        </div>
        <span class="tag ${done ? "done" : "intensity"}">${done ? "Feito" : workout.typeLabel}</span>
      </header>
      <p>${workout.description}</p>
      <div class="tag-row">
        <span class="tag">${workout.distance.toFixed(1)} km</span>
        <span class="tag intensity">${workout.target}</span>
      </div>
      ${workout.adaptation ? `<small>${workout.adaptation}</small>` : ""}
    </article>
  `;
}

function renderWorkoutSelectors() {
  const selects = [document.getElementById("workoutSelect"), document.getElementById("exportWorkoutSelect")];
  const upcoming = state.plan.length ? state.plan : [];
  selects.forEach((select) => {
    if (!select) return;
    select.innerHTML = "";
    if (select.id === "workoutSelect") {
      select.insertAdjacentHTML("beforeend", '<option value="custom">Treino avulso</option>');
    }
    upcoming.forEach((workout) => {
      const option = document.createElement("option");
      option.value = workout.id;
      option.textContent = `${formatDate(workout.date)} - ${workout.title} (${workout.distance.toFixed(1)} km)`;
      select.appendChild(option);
    });
  });
}

function renderHistory() {
  const feedback = document.getElementById("coachFeedback");
  const history = document.getElementById("historyList");
  const stats = calculateStats();
  feedback.className = "coach-feedback";
  feedback.textContent = coachFeedback(stats);

  if (!state.logs.length) {
    history.innerHTML = "";
    feedback.className = "coach-feedback empty-state";
    feedback.textContent = "Registre treinos para o treinador ajustar carga, volume e intensidade.";
    return;
  }

  history.innerHTML = state.logs
    .slice(0, 10)
    .map(
      (log) => `
      <article class="history-item">
        <div>
          <strong>${log.plannedTitle}</strong>
          <div class="history-meta">${formatDate(log.date)} - ${Number(log.distance || 0).toFixed(2)} km${log.durationSeconds ? ` - ${formatDuration(log.durationSeconds)}` : ""}</div>
        </div>
        <span class="tag ${log.effort >= 8 || log.feeling === "dor" ? "intensity" : ""}">RPE ${log.effort || "-"}</span>
        ${log.notes ? `<p>${escapeHtml(log.notes)}</p>` : ""}
      </article>
    `,
    )
    .join("");
}

function renderRaces() {
  const focus = document.getElementById("raceFocus");
  const list = document.getElementById("raceList");
  if (!focus || !list) return;

  const upcoming = state.races
    .filter((race) => parseISODate(race.date) >= startOfDay(new Date()))
    .sort((a, b) => parseISODate(a.date) - parseISODate(b.date));
  const next = upcoming[0];

  if (!state.races.length) {
    focus.className = "coach-feedback empty-state";
    focus.textContent = "Adicione uma prova para o calendario ajustar carga, longos e polimento.";
    list.innerHTML = "";
    return;
  }

  focus.className = "coach-feedback";
  focus.textContent = next
    ? `Proxima prova: ${next.name}, ${formatDate(next.date)}, ${next.distance} km. O ciclo reduz intensidade nos dias anteriores e marca a prova no calendario.`
    : "Todas as provas cadastradas ja passaram. Finalize o mes ou cadastre uma nova prova para o proximo ciclo.";

  list.innerHTML = state.races
    .slice()
    .sort((a, b) => parseISODate(a.date) - parseISODate(b.date))
    .map(
      (race) => `
      <article class="history-item race-item">
        <div>
          <strong>${escapeHtml(race.name)}</strong>
          <div class="history-meta">${formatDate(race.date)} - ${race.distance} km - Prioridade ${race.priority}</div>
        </div>
        <span class="tag ${race.priority === "A" ? "intensity" : ""}">${race.priority}</span>
        ${race.goal ? `<p>${escapeHtml(race.goal)}</p>` : ""}
        <button class="text-danger" data-delete-race="${race.id}">Remover</button>
      </article>
    `,
    )
    .join("");

  list.querySelectorAll("[data-delete-race]").forEach((button) => {
    button.addEventListener("click", () => {
      state.races = state.races.filter((race) => race.id !== button.dataset.deleteRace);
      if (state.profile && state.test) state.plan = generatePlan(state.profile, state.test, state.logs, state.races);
      saveState();
      renderAll();
      showToast("Prova removida e calendario recalculado.");
    });
  });
}

function nextUpcomingRace() {
  const today = startOfDay(new Date());
  return state.races
    .filter((race) => parseISODate(race.date) >= today)
    .sort((a, b) => parseISODate(a.date) - parseISODate(b.date))[0];
}

function finishCurrentCycle() {
  const summary = summarizeCurrentCycle();
  const lastWorkout = state.plan
    .slice()
    .sort((a, b) => parseISODate(a.date) - parseISODate(b.date))
    .at(-1);
  const nextStart = addDays(parseISODate(lastWorkout.date), 1);
  const weeklyKm = state.profile.weeklyKm || inferWeeklyKm(state.profile.currentDistance, state.profile.days.length);
  let nextVolume = weeklyKm;

  if (summary.hadPain || summary.avgEffort >= 7.5 || summary.adherence < 55) {
    nextVolume = weeklyKm * 0.9;
  } else if (summary.adherence >= 80 && summary.avgEffort <= 6) {
    nextVolume = weeklyKm * 1.06;
  }

  state.profile = {
    ...state.profile,
    weeklyKm: Math.round(nextVolume),
    longRunKm: roundHalf(Math.max(4, (state.profile.longRunKm || weeklyKm * 0.32) * (nextVolume / weeklyKm))),
    startDate: toISODate(nextStart),
  };
  state.cycle = {
    number: (state.cycle?.number || 1) + 1,
    startDate: state.profile.startDate,
    previousSummary: summary,
  };
  state.plan = generatePlan(state.profile, state.test, state.logs, state.races);
}

function summarizeCurrentCycle() {
  const plannedIds = new Set(state.plan.map((workout) => workout.id));
  const cycleLogs = state.logs.filter((log) => plannedIds.has(log.workoutId));
  const plannedKm = state.plan.reduce((sum, workout) => sum + workout.distance, 0);
  const doneKm = cycleLogs.reduce((sum, log) => sum + Number(log.distance || 0), 0);
  return {
    workoutsDone: cycleLogs.length,
    workoutsPlanned: state.plan.length,
    adherence: state.plan.length ? Math.round((cycleLogs.length / state.plan.length) * 100) : 0,
    plannedKm: roundHalf(plannedKm),
    doneKm: roundHalf(doneKm),
    avgEffort: cycleLogs.length ? roundHalf(average(cycleLogs.map((log) => Number(log.effort) || 5))) : 0,
    hadPain: cycleLogs.some((log) => log.feeling === "dor"),
  };
}

function renderGarmin() {
  const status = document.getElementById("syncStatus");
  status.classList.toggle("connected", state.garminConnected);
  status.querySelector("strong").textContent = state.garminConnected ? "Garmin conectado" : "Garmin desconectado";
  status.querySelector("span:last-child").textContent = state.garminConnected
    ? state.garminMode === "official"
      ? "Sincronizacao oficial via API"
      : "Modo simulado ativo"
    : "Pronto para importar .csv/.json";

  const preview = document.getElementById("importPreview");
  if (!state.imports.length) {
    preview.className = "import-preview empty-state";
    preview.textContent = "Nenhum arquivo importado.";
  } else {
    preview.className = "import-preview";
    preview.innerHTML = state.imports
      .slice(0, 4)
      .map((item) => `<div><strong>${escapeHtml(item.file)}</strong><br><span>${item.count} atividade(s) em ${formatDate(item.date)}</span></div>`)
      .join("");
  }
}

function generatePlan(profile, test, logs = [], races = []) {
  const days = [...profile.days].sort((a, b) => a - b);
  const start = nextTrainingDate(parseISODate(profile.startDate), days);
  const loadMetrics = calculateLoadMetrics(logs);
  const riskFactor = profile.risk === "conservador" ? 0.92 : profile.risk === "agressivo" ? 1.06 : 1;
  const levelFactor = profile.level === "iniciante" ? 0.9 : profile.level === "avancado" ? 1.08 : 1;
  const goalFactor = profile.goalDistance === "42K" ? 1.18 : profile.goalDistance === "21K" ? 1.1 : profile.goalDistance === "5K" ? 0.92 : 1;
  const weightFactor = profile.weightKg >= 110 ? 0.9 : profile.weightKg >= 95 ? 0.94 : profile.weightKg >= 85 ? 0.97 : 1;
  const safetyFactor = loadSafetyFactor(loadMetrics, profile);
  const baseVolume = Math.max(8, profile.weeklyKm * riskFactor * levelFactor * goalFactor * weightFactor * safetyFactor);
  const pattern = volumePattern(profile.risk);
  const workouts = [];

  for (let week = 1; week <= 4; week += 1) {
    const weekStart = addDays(start, (week - 1) * 7);
    const weekVolume = roundHalf(baseVolume * pattern[week - 1]);
    const weekEnd = addDays(weekStart, 6);
    const weekRaces = races.filter((race) => isDateBetween(parseISODate(race.date), weekStart, weekEnd));
    const slots = tuneSlotsForCycle(buildWeekSlots(days, profile.longRunDay, weekRaces), week, weekStart, races);
    const allocations = allocateDistances(weekVolume, slots, profile);
    const weekWorkouts = [];

    slots.forEach((slot, index) => {
      const workoutDate = slot.date ? parseISODate(slot.date) : dateForDayInWeek(weekStart, slot.day);
      const distance = allocations[index];
      const workout = buildWorkout({
        id: `w${week}-${index}-${slot.day}`,
        week,
        date: toISODate(workoutDate),
        dayName: fullDayNames[slot.day],
        type: slot.type,
        race: slot.race || null,
        distance,
        test,
        profile,
      });
      weekWorkouts.push(focusWorkoutForRace(workout, races, test));
    });

    weekWorkouts.sort((a, b) => parseISODate(a.date) - parseISODate(b.date));
    workouts.push(...weekWorkouts);
  }

  const adjusted = applyHistoricalAdjustments(workouts, logs);
  return enforcePlanSafety(adjusted, profile, loadMetrics, races);
}

function buildWeekSlots(days, preferredLongRunDay, weekRaces = []) {
  const available = [...days];
  const longDay = chooseLongRunDay(available, preferredLongRunDay);
  const nonLongDays = available.filter((day) => day !== longDay);
  const slots = [];

  if (available.length === 1) {
    slots.push({ day: available[0], type: "long" });
  } else {
    nonLongDays.forEach((day, index) => {
      let type = "easy";
      if (available.length === 2) type = index === 0 ? "quality" : "easy";
      if (available.length === 3) type = index === 0 ? "easy" : "quality";
      if (available.length === 4) type = index === 0 ? "recovery" : index === 1 ? "quality" : "easy";
      if (available.length >= 5) type = index === 0 ? "recovery" : index === 1 ? "quality" : index === 2 ? "easy" : index === 3 ? "tempo" : "fartlek";
      slots.push({ day, type });
    });
    slots.push({ day: longDay, type: "long" });
  }

  weekRaces.forEach((race) => {
    const raceDay = parseISODate(race.date).getDay();
    const existing = slots.find((slot) => slot.day === raceDay);
    if (existing) {
      existing.type = "race";
      existing.race = race;
      existing.date = race.date;
    } else {
      slots.push({ day: raceDay, type: "race", race, date: race.date });
    }
  });

  return slots.sort((a, b) => a.day - b.day);
}

function tuneSlotsForCycle(slots, week, weekStart, races) {
  const tuned = slots.map((slot) => ({ ...slot }));
  const weekEnd = addDays(weekStart, 6);
  const nextRace = races
    .filter((race) => parseISODate(race.date) > weekEnd)
    .sort((a, b) => parseISODate(a.date) - parseISODate(b.date))[0];
  const daysToRace = nextRace ? Math.round((parseISODate(nextRace.date) - weekStart) / 86400000) : null;

  if (daysToRace !== null && daysToRace <= 21 && daysToRace > 7) {
    const quality = tuned.find((slot) => slot.type === "quality" || slot.type === "tempo" || slot.type === "fartlek");
    if (quality) quality.type = "racepace";
  }

  if (week === 4) {
    const easy = tuned.find((slot) => slot.type === "easy");
    if (easy) easy.type = "progression";
  }

  return tuned;
}

function chooseLongRunDay(days, preferred) {
  if (preferred !== "auto" && days.includes(Number(preferred))) return Number(preferred);
  if (days.includes(6)) return 6;
  if (days.includes(0)) return 0;
  return days[days.length - 1];
}

function allocateDistances(weekVolume, slots, profile) {
  const distances = Array(slots.length).fill(0);
  let remaining = weekVolume;

  slots.forEach((slot, index) => {
    if (slot.type === "race") {
      distances[index] = Number(slot.race?.distance) || goalDistanceKm(profile.goalDistance);
      remaining -= distances[index];
    }
  });

  const weights = slots.map((slot) => {
    if (slot.type === "race") return 0;
    if (slot.type === "long") return profile.goalDistance === "42K" ? 0.44 : profile.goalDistance === "21K" ? 0.4 : 0.36;
    if (slot.type === "quality" || slot.type === "interval" || slot.type === "tempo" || slot.type === "hill" || slot.type === "racepace") return 0.22;
    if (slot.type === "fartlek") return 0.18;
    if (slot.type === "progression") return 0.17;
    if (slot.type === "recovery") return 0.12;
    return 0.16;
  });
  const weightSum = weights.reduce((sum, value) => sum + value, 0) || 1;
  const distributable = Math.max(0, remaining);

  slots.forEach((slot, index) => {
    if (slot.type === "race") return;
    const minDistance = slot.type === "recovery" ? 2.5 : 3;
    let value = roundHalf(Math.max(minDistance, (distributable * weights[index]) / weightSum));
    if (slot.type === "recovery") value = roundHalf(Math.min(value, Math.max(4, weekVolume * 0.18)));
    if (slot.type === "long") value = roundHalf(Math.max(value, Math.min(profile.longRunKm * 1.25, weekVolume * 0.45)));
    distances[index] = value;
  });

  const adjustableIndex = distances.findIndex((value, index) => slots[index].type !== "race" && slots[index].type !== "recovery" && value > 0);
  const diff = roundHalf(weekVolume - distances.reduce((sum, value) => sum + value, 0));
  if (adjustableIndex >= 0 && Math.abs(diff) >= 0.5) distances[adjustableIndex] = roundHalf(Math.max(2, distances[adjustableIndex] + diff));
  return distances.map((value) => Math.max(2, value));
}

function buildWorkout({ id, week, date, dayName, type, race, distance, test, profile }) {
  const qualityTypes = ["interval", "fartlek", "hill", "tempo"];
  const qualityType = qualityTypes[(week - 1) % qualityTypes.length];
  const finalType = type === "quality" ? qualityType : type;
  const pace = (zoneKey) => zoneRangeText(test, zoneKey);
  const common = {
    id,
    week,
    date,
    dayName,
    type: finalType,
    typeLabel: typeLabel(finalType),
    distance,
    target: "RPE 3-4",
    description: "",
    steps: [],
  };

  if (finalType === "race") {
    const raceDistance = Number(race?.distance) || distance;
    return {
      ...common,
      type: "race",
      typeLabel: "Prova",
      title: race?.name || `Prova ${raceDistance} km`,
      distance: raceDistance,
      target: race?.goal || raceTarget(test, raceDistance),
      description: `${raceDistance.toFixed(raceDistance % 1 ? 1 : 0)} km como prova ${race?.priority || "A"}. Aquecimento leve, largada controlada e progressao se sobrar energia.`,
      steps: ["Aquecimento 10-15 min", "Prova no alvo", "Desaquecer leve"],
      raceId: race?.id || null,
    };
  }

  if (finalType === "easy") {
    return {
      ...common,
      title: "Corrida leve",
      target: pace("easy"),
      description: `${distance.toFixed(1)} km em ritmo confortavel, terminando com 4 aceleracoes curtas se estiver bem.`,
      steps: ["Aquecimento natural", "Ritmo facil", "4 x 20 s solto"],
    };
  }

  if (finalType === "recovery") {
    return {
      ...common,
      title: "Regenerativo",
      target: "RPE 2-3",
      description: `${distance.toFixed(1)} km muito leve, foco em soltar pernas e manter cadencia relaxada.`,
      steps: ["Ritmo muito facil", "Mobilidade ao final"],
    };
  }

  if (finalType === "interval") {
    const reps = profile.level === "iniciante" ? 5 : profile.level === "avancado" ? 8 : 6;
    const repSize = distance >= 8 ? 800 : 400;
    return {
      ...common,
      title: `Intervalado ${reps} x ${repSize} m`,
      target: pace("interval"),
      description: `Aquecimento, ${reps} repeticoes de ${repSize} m forte controlado e trote leve entre tiros.`,
      steps: ["2 km leve", `${reps} x ${repSize} m no alvo`, "Recuperar trotando", "Desaquecer"],
    };
  }

  if (finalType === "fartlek") {
    const reps = profile.level === "iniciante" ? 8 : profile.level === "avancado" ? 14 : 10;
    return {
      ...common,
      title: `Fartlek ${reps} variacoes`,
      target: `${pace("steady")} nas partes fortes`,
      description: `Corrida com mudancas de ritmo: ${reps} blocos alternando forte controlado e leve, sem travar a recuperacao.`,
      steps: ["2 km leve", `${reps} x 1 min forte / 1 min leve`, "Desaquecer leve"],
    };
  }

  if (finalType === "hill") {
    const reps = profile.level === "iniciante" ? 6 : profile.level === "avancado" ? 10 : 8;
    return {
      ...common,
      title: `Subida ${reps} repeticoes`,
      target: "RPE 8-8.5",
      description: `Aquecimento, ${reps} subidas de 45 a 75 s em esforco firme, descendo leve para recuperar.`,
      steps: ["2 km leve", `${reps} x subida firme`, "Descer leve recuperando", "Desaquecer"],
    };
  }

  if (finalType === "progression") {
    return {
      ...common,
      title: "Progressivo",
      target: `${pace("easy")} para ${pace("steady")}`,
      description: `${distance.toFixed(1)} km com inicio facil, meio controlado e final firme sem virar tiro.`,
      steps: ["Primeiro terco leve", "Segundo terco moderado", "Ultimo terco firme controlado"],
    };
  }

  if (finalType === "racepace") {
    const raceKm = goalDistanceKm(profile.goalDistance);
    const estimated = estimateRaceTime(test.totalSeconds, 3, raceKm);
    const racePace = Math.round(estimated / raceKm);
    const blockKm = Math.max(2, roundHalf(distance * 0.45));
    return {
      ...common,
      title: "Ritmo de prova",
      target: `${formatPace(racePace + 5)}-${formatPace(racePace + 20)}/km`,
      description: `Ensaio para ${goalLabel(profile.goalDistance)}: ${blockKm.toFixed(1)} km no ritmo alvo dentro do treino.`,
      steps: ["2 km leve", `${blockKm.toFixed(1)} km em ritmo de prova`, "Desaquecer"],
    };
  }

  if (finalType === "tempo") {
    const tempoKm = Math.max(2, roundHalf(distance * 0.48));
    return {
      ...common,
      title: "Ritmo limiar",
      target: pace("threshold"),
      description: `2 km leve, ${tempoKm.toFixed(1)} km em ritmo forte sustentavel e desaquecimento.`,
      steps: ["2 km leve", `${tempoKm.toFixed(1)} km em limiar`, "Desaquecer leve"],
    };
  }

  return {
    ...common,
    title: "Longao",
    target: pace("long"),
    description: `${distance.toFixed(1)} km em ritmo facil, com os ultimos 15 min um pouco mais firmes se sobrar energia.`,
    steps: ["Ritmo facil", "Hidratacao", "Final progressivo opcional"],
  };
}

function applyHistoricalAdjustments(workouts, logs) {
  const recent = logs.slice(0, 4);
  if (!recent.length) return workouts;
  const avgEffort = average(recent.map((log) => Number(log.effort) || 5));
  const hadPain = recent.some((log) => log.feeling === "dor");
  const feltHeavy = recent.some((log) => log.feeling === "pesado" || Number(log.effort) >= 9);
  const feltGreat = recent.length >= 2 && avgEffort <= 4.5 && !hadPain && !feltHeavy;

  return workouts.map((workout, index) => {
    if (workout.type === "race") return workout;
    if (hadPain && index < 4) {
      return softenWorkout(workout, 0.82, "Carga reduzida por relato recente de dor/incômodo.");
    }
    if (feltHeavy && index < 3) {
      return softenWorkout(workout, 0.9, "Volume ajustado por esforco alto no diario.");
    }
    if (feltGreat && ["easy", "long"].includes(workout.type) && index > 3) {
      return {
        ...workout,
        distance: roundHalf(workout.distance * 1.03),
        adaptation: "Pequena progressao aplicada por boa tolerancia recente.",
      };
    }
    return workout;
  });
}

function softenWorkout(workout, multiplier, adaptation) {
  if (workout.type === "race") return workout;
  const softened = {
    ...workout,
    distance: roundHalf(Math.max(2, workout.distance * multiplier)),
    adaptation,
  };
  if (["interval", "tempo", "fartlek", "hill", "racepace"].includes(workout.type)) {
    softened.type = "easy";
    softened.typeLabel = "Leve";
    softened.title = "Corrida leve ajustada";
    softened.target = zoneRangeText(state.test, "easy");
    softened.description = `${softened.distance.toFixed(1)} km leve para recuperar sem perder consistencia.`;
  }
  return softened;
}

function focusWorkoutForRace(workout, races, test) {
  if (workout.type === "race") return workout;
  const workoutDate = parseISODate(workout.date);
  const nextRace = races
    .filter((race) => parseISODate(race.date) > workoutDate)
    .sort((a, b) => parseISODate(a.date) - parseISODate(b.date))[0];
  if (!nextRace) return workout;

  const daysToRace = Math.round((parseISODate(nextRace.date) - workoutDate) / 86400000);
  if (daysToRace > 10) return workout;
  if (daysToRace <= 2) {
    return {
      ...workout,
      type: "recovery",
      typeLabel: "Soltar",
      title: "Ativacao pre-prova",
      distance: roundHalf(Math.max(2, Math.min(workout.distance, 4))),
      target: "RPE 2-3",
      description: `Soltar pernas para ${nextRace.name}: corrida curta, leve e com 4 aceleracoes de 15 s.`,
      steps: ["Leve", "4 x 15 s solto", "Mobilidade"],
      adaptation: "Polimento automatico por prova proxima.",
    };
  }
  if (daysToRace <= 5 && ["interval", "tempo", "fartlek", "hill", "racepace", "progression", "long"].includes(workout.type)) {
    return {
      ...workout,
      type: "easy",
      typeLabel: "Leve",
      title: "Corrida leve de polimento",
      distance: roundHalf(Math.max(3, workout.distance * 0.72)),
      target: zoneRangeText(test, "easy"),
      description: `Reduzido para chegar descansado em ${nextRace.name}. Ritmo facil e sem disputar treino.`,
      steps: ["Ritmo facil", "Cadencia solta", "Alongamento leve"],
      adaptation: "Carga reduzida por foco em prova.",
    };
  }
  if (daysToRace <= 10 && workout.type === "long") {
    return {
      ...workout,
      distance: roundHalf(workout.distance * 0.82),
      description: `${roundHalf(workout.distance * 0.82).toFixed(1)} km leve, preservando energia para ${nextRace.name}.`,
      adaptation: "Longao encurtado por prova no ciclo.",
    };
  }
  return workout;
}

function adaptPlanAfterLog(log) {
  const planned = state.plan.find((workout) => workout.id === log.workoutId);
  if (!planned) return;
  const ratio = planned.distance ? log.distance / planned.distance : 1;
  const heavy = log.feeling === "dor" || log.feeling === "pesado" || log.effort >= 9 || ratio < 0.75;
  const easy = log.effort <= 4 && ratio >= 0.95 && !["dor", "pesado"].includes(log.feeling);
  const logDate = parseISODate(log.date);
  let changedFirstQuality = false;

  state.plan = state.plan.map((workout) => {
    if (parseISODate(workout.date) <= logDate || state.logs.some((item) => item.workoutId === workout.id && item.id !== log.id)) return workout;
    if (workout.type === "race") return workout;
    if (heavy) {
      if (!changedFirstQuality && ["interval", "tempo", "fartlek", "hill", "racepace"].includes(workout.type)) {
        changedFirstQuality = true;
        return softenWorkout(workout, 0.86, "Ajustado apos treino pesado ou incompleto.");
      }
      return {
        ...workout,
        distance: roundHalf(Math.max(2, workout.distance * 0.93)),
        adaptation: "Volume reduzido para controlar fadiga.",
      };
    }
    if (easy && ["easy", "long", "progression"].includes(workout.type)) {
      return {
        ...workout,
        distance: roundHalf(workout.distance * 1.02),
        adaptation: "Progressao leve por boa resposta no treino anterior.",
      };
    }
    return workout;
  });
}

function zonesFromTest(test) {
  return zoneDefs.map((zone) => ({
    ...zone,
    range: test ? `${formatPace(test.paceSeconds + zone.offset[0])}-${formatPace(test.paceSeconds + zone.offset[1])}/km` : "Aguardando teste",
  }));
}

function zoneRangeText(test, key) {
  if (!test) {
    const labels = {
      easy: "RPE 3-4",
      long: "RPE 3-4",
      threshold: "RPE 7-8",
      interval: "RPE 8-9",
    };
    return labels[key] || "Por sensacao";
  }
  const zone = zoneDefs.find((item) => item.key === key);
  return `${formatPace(test.paceSeconds + zone.offset[0])}-${formatPace(test.paceSeconds + zone.offset[1])}/km`;
}

function findNextWorkout() {
  const done = new Set(state.logs.map((log) => log.workoutId));
  const today = startOfDay(new Date());
  return (
    state.plan.find((workout) => !done.has(workout.id) && parseISODate(workout.date) >= today) ||
    state.plan.find((workout) => !done.has(workout.id)) ||
    null
  );
}

function calculateStats() {
  const today = startOfDay(new Date());
  const dueWorkouts = state.plan.filter((workout) => parseISODate(workout.date) <= today);
  const donePlanned = state.logs.filter((log) => log.workoutId && log.workoutId !== "custom").length;
  const due = dueWorkouts.length || state.plan.length;
  const adherence = due ? Math.min(100, Math.round((donePlanned / due) * 100)) : 0;
  const recent = state.logs.slice(0, 5);
  const avgEffort = recent.length ? average(recent.map((log) => Number(log.effort) || 5)) : 0;
  const hadPain = recent.some((log) => log.feeling === "dor");
  let loadStatus = "Base";
  let loadAdvice = "Sem ajustes ainda";

  if (hadPain) {
    loadStatus = "Cautela";
    loadAdvice = "Priorize leveza e recuperacao";
  } else if (avgEffort >= 7.5) {
    loadStatus = "Alta";
    loadAdvice = "Proximos treinos com controle";
  } else if (adherence >= 80 && avgEffort > 0 && avgEffort <= 5.5) {
    loadStatus = "Progredindo";
    loadAdvice = "Boa resposta recente";
  } else if (state.logs.length) {
    loadStatus = "Estavel";
    loadAdvice = "Continue registrando";
  }

  return { adherence, done: donePlanned, due, avgEffort, hadPain, loadStatus, loadAdvice };
}

function coachFeedback(stats) {
  if (!state.logs.length) return "Registre treinos para o treinador ajustar carga, volume e intensidade.";
  if (stats.hadPain) return "Voce relatou dor/incômodo recentemente. Os proximos treinos intensos foram suavizados e o volume ficou mais conservador.";
  if (stats.avgEffort >= 7.5) return "A percepcao de esforco subiu. Mantenha os treinos leves realmente leves e evite acelerar o longao.";
  if (stats.adherence >= 80 && stats.avgEffort <= 5.5) return "Boa consistencia e carga bem tolerada. O plano pode evoluir aos poucos sem pressa.";
  return "O diario ja esta alimentando o treinador. Quanto mais detalhes de ritmo, RPE e sensacao, melhores ficam os ajustes.";
}

function inferWeeklyKm(range, days) {
  const map = {
    "0-3": 10,
    "3-5": 16,
    "5-10": 24,
    "10-16": 38,
    "16+": 52,
  };
  return Math.max(days * 3, map[range] || 18);
}

function volumePattern(risk) {
  if (risk === "conservador") return [1, 1.04, 1.08, 0.9];
  if (risk === "agressivo") return [1, 1.1, 1.16, 0.94];
  return [1, 1.07, 1.12, 0.92];
}

function calculateLoadMetrics(logs = []) {
  const today = startOfDay(new Date());
  const acuteStart = addDays(today, -6);
  const chronicStart = addDays(today, -27);
  const painWindowStart = addDays(today, -13);
  const heavyWindowStart = addDays(today, -9);

  const validLogs = logs
    .filter((log) => log?.date && Number(log.distance) > 0)
    .map((log) => ({
      ...log,
      dateObj: startOfDay(parseISODate(log.date)),
      distanceKm: Math.max(0, Number(log.distance) || 0),
      effortValue: Number(log.effort) || 0,
    }))
    .sort((a, b) => b.dateObj - a.dateObj);

  let acuteKm = 0;
  let chronicKm = 0;
  let painEvents14d = 0;
  let heavySignals10d = 0;
  let acuteSessions = 0;

  const weeklyKm = new Map();
  validLogs.forEach((log) => {
    if (log.dateObj >= acuteStart && log.dateObj <= today) {
      acuteKm += log.distanceKm;
      acuteSessions += 1;
    }
    if (log.dateObj >= chronicStart && log.dateObj <= today) chronicKm += log.distanceKm;
    if (log.dateObj >= painWindowStart && log.feeling === "dor") painEvents14d += 1;
    if (log.dateObj >= heavyWindowStart && (log.feeling === "pesado" || log.effortValue >= 8)) heavySignals10d += 1;

    const weekStart = addDays(log.dateObj, -log.dateObj.getDay());
    const weekKey = toISODate(weekStart);
    weeklyKm.set(weekKey, (weeklyKm.get(weekKey) || 0) + log.distanceKm);
  });

  const currentWeekStart = addDays(today, -today.getDay());
  const last4Weeks = [];
  for (let i = 0; i < 4; i += 1) {
    const weekStart = addDays(currentWeekStart, -i * 7);
    const key = toISODate(weekStart);
    last4Weeks.push(weeklyKm.get(key) || 0);
  }

  const currentWeekKm = last4Weeks[0] || 0;
  const previousWeekKm = last4Weeks[1] || 0;
  const chronicWeeklyAverage = average(last4Weeks);
  const acwr = chronicWeeklyAverage > 0 ? acuteKm / chronicWeeklyAverage : 1;
  const weekRamp = previousWeekKm > 0 ? currentWeekKm / previousWeekKm : 1;
  const lastLogDate = validLogs[0]?.dateObj || null;
  const inactivityDays = lastLogDate ? Math.round((today - lastLogDate) / 86400000) : 999;

  return {
    logsCount: validLogs.length,
    acuteKm: roundHalf(acuteKm),
    chronicKm: roundHalf(chronicKm),
    chronicWeeklyAverage: roundHalf(chronicWeeklyAverage),
    acwr: Number(acwr.toFixed(2)),
    weekRamp: Number(weekRamp.toFixed(2)),
    currentWeekKm: roundHalf(currentWeekKm),
    previousWeekKm: roundHalf(previousWeekKm),
    acuteSessions,
    painEvents14d,
    heavySignals10d,
    inactivityDays,
  };
}

function loadSafetyFactor(loadMetrics, profile) {
  let factor = 1;

  if (loadMetrics.painEvents14d > 0) factor *= 0.84;
  if (loadMetrics.heavySignals10d >= 3) factor *= 0.92;
  else if (loadMetrics.heavySignals10d === 2) factor *= 0.95;

  if (loadMetrics.acwr >= 1.5) factor *= 0.82;
  else if (loadMetrics.acwr >= 1.35) factor *= 0.9;
  else if (loadMetrics.acwr < 0.7 && loadMetrics.logsCount >= 8) factor *= 0.95;

  if (loadMetrics.weekRamp >= 1.25) factor *= 0.9;
  if (loadMetrics.inactivityDays >= 10) factor *= 0.86;
  if (profile.level === "iniciante") factor *= 0.97;
  if (profile.weightKg >= 95 && loadMetrics.logsCount >= 4) factor *= 0.96;

  return clampValue(factor, 0.68, 1.02);
}

function enforcePlanSafety(workouts, profile, loadMetrics, races) {
  const qualityTypes = new Set(["interval", "tempo", "fartlek", "hill", "racepace", "progression"]);
  const sorted = workouts
    .slice()
    .sort((a, b) => parseISODate(a.date) - parseISODate(b.date))
    .map((workout) => ({ ...workout }));

  let hardCountWeek = new Map();
  sorted.forEach((workout, index) => {
    if (workout.type === "race") return;
    const weekKey = `w${workout.week || 0}`;
    const wasHard = qualityTypes.has(workout.type) || workout.type === "long";
    const usedHard = hardCountWeek.get(weekKey) || 0;

    if (qualityTypes.has(workout.type) && usedHard >= 2) {
      sorted[index] = softenWorkout(workout, 0.88, "Limite de intensidade semanal aplicado.");
      hardCountWeek.set(weekKey, usedHard + 1);
      return;
    }

    const previous = sorted[index - 1];
    if (previous) {
      const daysBetween = Math.round((parseISODate(workout.date) - parseISODate(previous.date)) / 86400000);
      const previousHard = qualityTypes.has(previous.type) || previous.type === "long" || previous.type === "race";
      if (daysBetween <= 1 && previousHard && qualityTypes.has(workout.type)) {
        sorted[index] = softenWorkout(workout, 0.9, "Recuperacao preservada entre treinos duros.");
      }
    }

    if (wasHard) hardCountWeek.set(weekKey, usedHard + 1);
  });

  for (let week = 2; week <= 4; week += 1) {
    const current = sorted.filter((workout) => workout.week === week);
    const previous = sorted.filter((workout) => workout.week === week - 1);
    const currentVolume = current.reduce((sum, workout) => sum + workout.distance, 0);
    const previousVolume = previous.reduce((sum, workout) => sum + workout.distance, 0);
    if (!previousVolume || !currentVolume) continue;

    const maxRamp = week === 4 ? 0.97 : 1.1;
    const maxVolume = previousVolume * maxRamp;
    if (currentVolume <= maxVolume + 0.2) continue;

    const scale = maxVolume / currentVolume;
    current.forEach((workout) => {
      if (workout.type === "race") return;
      workout.distance = roundHalf(Math.max(2, workout.distance * scale));
      workout.adaptation = "Ajuste de progressao semanal para reduzir risco de excesso.";
      if (qualityTypes.has(workout.type)) {
        const raceNear = races.some((race) => {
          const delta = Math.abs((parseISODate(race.date) - parseISODate(workout.date)) / 86400000);
          return delta <= 6;
        });
        if (raceNear) {
          workout.type = "easy";
          workout.typeLabel = "Leve";
          workout.title = "Leve pre-prova";
          workout.target = zoneRangeText(state.test, "easy");
          workout.description = `${workout.distance.toFixed(1)} km leve para absorver carga antes da prova.`;
        }
      }
    });
  }

  const longRunCap = profile.goalDistance === "42K" ? 0.46 : profile.goalDistance === "21K" ? 0.42 : 0.38;
  for (let week = 1; week <= 4; week += 1) {
    const weekRuns = sorted.filter((workout) => workout.week === week);
    const weekVolume = weekRuns.reduce((sum, workout) => sum + workout.distance, 0);
    const longRun = weekRuns.find((workout) => workout.type === "long");
    if (!longRun || !weekVolume) continue;
    const maxLong = roundHalf(weekVolume * longRunCap);
    if (longRun.distance <= maxLong) continue;

    const excess = longRun.distance - maxLong;
    longRun.distance = maxLong;
    longRun.adaptation = "Longao limitado para manter distribuicao semanal segura.";

    const receivers = weekRuns.filter((workout) => ["easy", "recovery", "progression"].includes(workout.type) && workout.id !== longRun.id);
    if (!receivers.length) continue;
    const bonus = roundHalf(excess / receivers.length);
    receivers.forEach((workout) => {
      workout.distance = roundHalf(Math.max(2, workout.distance + bonus));
    });
  }

  if (loadMetrics.painEvents14d > 0 || loadMetrics.inactivityDays >= 10) {
    return sorted.map((workout, index) => {
      if (workout.type === "race") return workout;
      if (index > 5 && workout.type === "long" && workout.distance > profile.longRunKm * 1.05) {
        return {
          ...workout,
          distance: roundHalf(profile.longRunKm * 1.05),
          adaptation: "Retorno progressivo apos dor/pausa recente.",
        };
      }
      return softenWorkout(workout, 0.94, "Bloco de controle para retorno seguro.");
    });
  }

  return sorted;
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function typeLabel(type) {
  return {
    easy: "Leve",
    recovery: "Soltar",
    interval: "Tiro",
    fartlek: "Fartlek",
    hill: "Subida",
    progression: "Progressivo",
    racepace: "Ritmo prova",
    tempo: "Limiar",
    long: "Longao",
    race: "Prova",
  }[type] || "Treino";
}

function goalDistanceKm(goal) {
  return {
    "5K": 5,
    "10K": 10,
    "21K": 21.1,
    "42K": 42.2,
    base: 10,
  }[goal] || 10;
}

function raceTarget(test, distance) {
  if (!test) return "Largar controlado e progredir";
  const estimated = estimateRaceTime(test.totalSeconds, 3, distance);
  return `Referencia ${formatDuration(estimated)} (${formatPace(Math.round(estimated / distance))}/km)`;
}

function goalLabel(goal) {
  return {
    "5K": "5 km",
    "10K": "10 km",
    "21K": "meia maratona",
    "42K": "maratona",
    base: "ganho de base",
  }[goal] || goal;
}

function selectedExportWorkout() {
  const select = document.getElementById("exportWorkoutSelect");
  return state.plan.find((workout) => workout.id === select.value) || state.plan[0] || null;
}

function toGarminWorkout(workout) {
  return {
    provider: "RunPro Coach",
    sport: "RUNNING",
    name: workout.title,
    scheduledDate: workout.date,
    estimatedDistanceKm: workout.distance,
    target: workout.target,
    description: workout.description,
    steps: workout.steps.map((step, index) => ({
      order: index + 1,
      instruction: step,
      intensity: workout.type.toUpperCase(),
    })),
    note: "Formato de prototipo. Em producao, enviar via Garmin Training API/FIT workout.",
  };
}

function toTcxWorkout(workout) {
  const steps = workout.steps
    .map(
      (step, index) => `
        <Step>
          <StepId>${index + 1}</StepId>
          <Name>${escapeXml(step)}</Name>
          <Intensity>${workout.type === "recovery" ? "Resting" : "Active"}</Intensity>
        </Step>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Workouts>
    <Workout Sport="Running">
      <Name>${escapeXml(workout.title)}</Name>
      <Notes>${escapeXml(workout.description)} Alvo: ${escapeXml(workout.target)}</Notes>
      ${steps}
    </Workout>
  </Workouts>
</TrainingCenterDatabase>`;
}

function normalizeImportedActivity(row) {
  const date = row.date || row.Date || row.data || toISODate(new Date());
  const distance = Number(row.distance ?? row.Distance ?? row.distancia ?? row.km);
  if (!distance) return null;
  const durationRaw = row.duration || row.Duration || row.duracao || row.time;
  return {
    id: crypto.randomUUID(),
    workoutId: "garmin-import",
    plannedTitle: row.title || row.name || "Atividade Garmin",
    date,
    distance,
    durationSeconds: durationRaw ? parseTime(String(durationRaw)) : null,
    effort: Number(row.effort || row.rpe || row.RPE) || 5,
    feeling: row.feeling || row.sensacao || "bom",
    notes: row.notes || row.observacoes || "Importado do arquivo Garmin.",
    source: "garmin-file",
  };
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines.shift()).map((header) => header.trim());
  return lines.map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index]?.trim() || "";
      return obj;
    }, {});
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function parseTime(value) {
  if (!value) return null;
  const parts = String(value)
    .trim()
    .split(":")
    .map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 1) return Math.round(parts[0] * 60);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function formatDuration(seconds) {
  const rounded = Math.round(seconds || 0);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatPace(seconds) {
  return formatDuration(Math.max(120, Math.round(seconds)));
}

function estimateRaceTime(timeSeconds, fromKm, toKm) {
  return Math.round(timeSeconds * (toKm / fromKm) ** 1.06);
}

function dateForDayInWeek(weekStart, targetDay) {
  const start = startOfDay(weekStart);
  const startDay = start.getDay();
  const diff = (targetDay - startDay + 7) % 7;
  return addDays(start, diff);
}

function nextTrainingDate(date, days) {
  const start = startOfDay(date);
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = addDays(start, offset);
    if (days.includes(candidate.getDay())) return candidate;
  }
  return start;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isDateBetween(date, start, end) {
  const value = startOfDay(date).getTime();
  return value >= startOfDay(start).getTime() && value <= startOfDay(end).getTime();
}

function toISODate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value) {
  const date = parseISODate(value);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function parseISODate(value) {
  if (value instanceof Date) return startOfDay(value);
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function roundHalf(value) {
  return Math.round(value * 2) / 2;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const value = item[key];
    groups[value] = groups[value] || [];
    groups[value].push(item);
    return groups;
  }, {});
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeXml(value = "") {
  return escapeHtml(value);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}
