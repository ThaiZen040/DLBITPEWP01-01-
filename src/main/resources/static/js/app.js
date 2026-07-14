// Zentraler Frontend-Zustand: geladene Forumdaten, aktiver Benutzer und Editiermodus.
const state = {
    topics: [],
    posts: [],
    currentUser: null,
    editingTopicId: null,
    editingPostId: null,
    authStateRevision: 0
};

const apiBaseUrl = resolveApiBaseUrl();

// REST-Endpunkte des Spring-Boot-Backends.
const endpoints = {
    topics: `${apiBaseUrl}/topics`,
    posts: `${apiBaseUrl}/posts`,
    register: `${apiBaseUrl}/register`,
    login: `${apiBaseUrl}/login`,
    session: `${apiBaseUrl}/session`,
    logout: `${apiBaseUrl}/logout`
};

const storedUserKey = "webforum-current-user";
const windowNameUserPrefix = "__webforum_current_user__:";
const roleLabels = {
    GUEST: "Guest",
    USER: "User",
    MODERATOR: "Moderator",
    ADMIN: "Admin"
};

// Die gleiche JavaScript-Datei wird auf index.html und auth.html benutzt.
const pageType = document.body?.dataset?.page ?? "home";
const authTemplates = {
    loginCard: ""
};

state.currentUser = loadStoredUser();

// Alle wichtigen DOM-Elemente werden einmal gesammelt, damit die Funktionen lesbarer bleiben.
const elements = {
    alertHost: document.getElementById("alertHost"),
    currentUserPanel: document.getElementById("currentUserPanel"),
    activeUserState: document.getElementById("activeUserState"),
    authShortcutCard: document.getElementById("authShortcutCard"),
    loadTopicsButton: document.getElementById("loadTopicsButton"),
    loginCard: document.getElementById("loginCard"),
    loginForm: document.getElementById("loginForm"),
    registerCard: document.getElementById("registerCard"),
    registerForm: document.getElementById("registerForm"),
    topicForm: document.getElementById("topicForm"),
    postForm: document.getElementById("postForm"),
    topicList: document.getElementById("topicList"),
    topicCount: document.getElementById("topicCount"),
    postCount: document.getElementById("postCount"),
    topicId: document.getElementById("topicId"),
    topicTitle: document.getElementById("topicTitle"),
    topicContent: document.getElementById("topicContent"),
    saveTopicButton: document.getElementById("saveTopicButton"),
    cancelTopicEditButton: document.getElementById("cancelTopicEditButton"),
    postId: document.getElementById("postId"),
    postTopicId: document.getElementById("postTopicId"),
    postContent: document.getElementById("postContent"),
    savePostButton: document.getElementById("savePostButton"),
    cancelPostEditButton: document.getElementById("cancelPostEditButton"),
    systemStatus: document.getElementById("systemStatus")
};

// Initialisierung nach dem Laden der HTML-Seite.
document.addEventListener("DOMContentLoaded", async () => {
    refreshDynamicElements();
    captureAuthTemplates();
    wireEvents();
    renderCurrentUser();
    renderAuthPageState();
    renderStats();
    showStoredFlashMessage();

    await syncCurrentUserFromBackend();

    if (isForumPage()) {
        await loadForumData();
    }
});

// Verbindet Buttons und Formulare mit den passenden JavaScript-Funktionen.
function wireEvents() {
    addListener(document, "click", handleGlobalActionClick);
    addListener(elements.loadTopicsButton, "click", loadForumData);
    addListener(elements.loginForm, "submit", handleLogin);
    addListener(elements.registerForm, "submit", handleRegistration);
    addListener(elements.topicForm, "submit", handleTopicSubmit);
    addListener(elements.postForm, "submit", handlePostSubmit);
    addListener(elements.cancelTopicEditButton, "click", resetTopicForm);
    addListener(elements.cancelPostEditButton, "click", resetPostForm);
    addListener(elements.topicList, "click", handleTopicListClick);
}

// Manche Elemente existieren nur auf einer der beiden Seiten. Diese Hilfsfunktion verhindert Fehler.
function addListener(element, eventName, handler) {
    if (element) {
        element.addEventListener(eventName, handler);
    }
}

function refreshDynamicElements() {
    elements.alertHost = document.getElementById("alertHost");
    elements.currentUserPanel = document.getElementById("currentUserPanel");
    elements.activeUserState = document.getElementById("activeUserState");
    elements.authShortcutCard = document.getElementById("authShortcutCard");
    elements.loadTopicsButton = document.getElementById("loadTopicsButton");
    elements.loginCard = document.getElementById("loginCard");
    elements.loginForm = document.getElementById("loginForm");
    elements.registerCard = document.getElementById("registerCard");
    elements.registerForm = document.getElementById("registerForm");
    elements.topicForm = document.getElementById("topicForm");
    elements.postForm = document.getElementById("postForm");
    elements.topicList = document.getElementById("topicList");
    elements.topicCount = document.getElementById("topicCount");
    elements.postCount = document.getElementById("postCount");
    elements.topicId = document.getElementById("topicId");
    elements.topicTitle = document.getElementById("topicTitle");
    elements.topicContent = document.getElementById("topicContent");
    elements.saveTopicButton = document.getElementById("saveTopicButton");
    elements.cancelTopicEditButton = document.getElementById("cancelTopicEditButton");
    elements.postId = document.getElementById("postId");
    elements.postTopicId = document.getElementById("postTopicId");
    elements.postContent = document.getElementById("postContent");
    elements.savePostButton = document.getElementById("savePostButton");
    elements.cancelPostEditButton = document.getElementById("cancelPostEditButton");
    elements.systemStatus = document.getElementById("systemStatus");
}

function captureAuthTemplates() {
    if (pageType === "auth" && elements.loginCard && !authTemplates.loginCard) {
        authTemplates.loginCard = elements.loginCard.innerHTML;
    }
}

function isForumPage() {
    return pageType === "home";
}

function handleGlobalActionClick(event) {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) {
        return;
    }

    if (actionButton.dataset.action === "logout") {
        event.preventDefault();
        handleLogout();
    }
}

// Lädt Themen und Beiträge parallel vom Backend und aktualisiert danach die Oberfläche.
async function loadForumData() {
    updateStatus("Daten werden geladen...");

    try {
        const [topics, posts] = await Promise.all([
            requestJson(endpoints.topics),
            requestJson(endpoints.posts)
        ]);

        state.topics = sortByNewest(topics);
        state.posts = sortByNewest(posts);

        renderTopics();
        renderTopicOptions();
        syncEditorState();
        renderStats();
        updateStatus("Forumdaten erfolgreich geladen.");
    } catch (error) {
        renderTopicsError(error);
        renderTopicOptions();
        renderStats();
        updateStatus("Laden fehlgeschlagen.");
        showAlert("danger", `Forumdaten konnten nicht geladen werden: ${formatRequestError(error)}`);
    }
}

// Sendet die Login-Daten an das Backend und setzt den angemeldeten Benutzer als aktiven User.
async function handleLogin(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
        username: formData.get("username").toString().trim(),
        password: formData.get("password").toString()
    };

    try {
        setFormLoading(form, true);
        const user = await requestJson(endpoints.login, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const safeUser = sanitizeUser(user);
        form.reset();
        await finalizeAuthentication(safeUser, `Willkommen zurück, ${safeUser.username}.`);
    } catch (error) {
        showAlert("danger", `Login fehlgeschlagen: ${formatRequestError(error)}`);
    } finally {
        setFormLoading(form, false);
    }
}

// Sendet Registrierungsdaten an das Backend und nutzt den neuen Benutzer direkt als aktiven User.
async function handleRegistration(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
        username: formData.get("username").toString().trim(),
        email: formData.get("email").toString().trim(),
        passwordHash: formData.get("password").toString(),
        role: normalizeRole(formData.get("role"))
    };

    try {
        setFormLoading(form, true);
        const user = await requestJson(endpoints.register, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const safeUser = sanitizeUser(user);
        form.reset();
        await finalizeAuthentication(safeUser, `Benutzer ${safeUser.username} wurde erstellt und ist jetzt angemeldet.`);
    } catch (error) {
        showAlert("danger", `Registrierung fehlgeschlagen: ${formatRequestError(error)}`);
    } finally {
        setFormLoading(form, false);
    }
}

async function handleLogout() {
    try {
        await requestVoid(endpoints.logout, {
            method: "POST"
        });
    } catch (error) {
        if (!isBackendUnavailable(error)) {
            showAlert("danger", `Logout fehlgeschlagen: ${formatRequestError(error)}`);
            return;
        }
    }

    state.authStateRevision += 1;
    state.currentUser = null;
    clearStoredUser();
    renderCurrentUser();
    renderAuthPageState();
    renderStats();
    resetTopicForm();
    resetPostForm();
    showAlert("info", "Du wurdest abgemeldet.");
}

// Erstellt ein neues Thema oder aktualisiert ein bestehendes Thema, wenn gerade editiert wird.
async function handleTopicSubmit(event) {
    event.preventDefault();

    if (!state.currentUser?.id) {
        showAlert("warning", "Bitte zuerst registrieren oder einloggen, bevor du ein Thema speicherst.");
        return;
    }

    const formData = new FormData(event.currentTarget);
    const topicId = parseOptionalId(formData.get("topicId"));
    const existingTopic = topicId ? state.topics.find((topic) => Number(topic.id) === topicId) : null;
    const timestamp = buildTimestamp();
    const payload = {
        title: formData.get("title").toString().trim(),
        content: formData.get("content").toString().trim(),
        author: buildUserReference(existingTopic?.author ?? state.currentUser),
        createdAt: existingTopic?.createdAt ?? timestamp,
        updatedAt: timestamp
    };

    const url = topicId ? `${endpoints.topics}/${topicId}` : endpoints.topics;
    const method = topicId ? "PUT" : "POST";

    try {
        setFormLoading(elements.topicForm, true);
        await requestJson(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        resetTopicForm();
        await loadForumData();
        showAlert("success", topicId ? "Das Thema wurde aktualisiert." : "Das Thema wurde gespeichert.");
    } catch (error) {
        if (expireLocalSessionIfNeeded(error)) {
            return;
        }

        showAlert("danger", `Thema konnte nicht gespeichert werden: ${formatRequestError(error)}`);
    } finally {
        setFormLoading(elements.topicForm, false);
    }
}

// Erstellt einen Beitrag oder aktualisiert einen bestehenden Beitrag im Bearbeitungsmodus.
async function handlePostSubmit(event) {
    event.preventDefault();

    if (!state.currentUser?.id) {
        showAlert("warning", "Bitte zuerst registrieren oder einloggen, bevor du einen Beitrag speicherst.");
        return;
    }

    const formData = new FormData(event.currentTarget);
    const postId = parseOptionalId(formData.get("postId"));
    const selectedTopicId = parseOptionalId(formData.get("topicId"));

    if (!selectedTopicId) {
        showAlert("warning", "Bitte zuerst ein Thema für den Beitrag auswählen.");
        return;
    }

    const existingPost = postId ? state.posts.find((post) => Number(post.id) === postId) : null;
    const timestamp = buildTimestamp();
    const payload = {
        content: formData.get("content").toString().trim(),
        author: buildUserReference(existingPost?.author ?? state.currentUser),
        topic: buildTopicReference(selectedTopicId),
        createdAt: existingPost?.createdAt ?? timestamp,
        updatedAt: timestamp
    };

    const url = postId ? `${endpoints.posts}/${postId}` : endpoints.posts;
    const method = postId ? "PUT" : "POST";

    try {
        setFormLoading(elements.postForm, true);
        await requestJson(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        resetPostForm();
        await loadForumData();
        showAlert("success", postId ? "Der Beitrag wurde aktualisiert." : "Der Beitrag wurde gespeichert.");
    } catch (error) {
        if (expireLocalSessionIfNeeded(error)) {
            return;
        }

        showAlert("danger", `Beitrag konnte nicht gespeichert werden: ${formatRequestError(error)}`);
    } finally {
        setFormLoading(elements.postForm, false);
    }
}

// Wertet Klicks in der Themenliste aus, z. B. Bearbeiten oder Löschen.
function handleTopicListClick(event) {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) {
        return;
    }

    const action = actionButton.dataset.action;
    const topicId = parseOptionalId(actionButton.dataset.topicId);
    const postId = parseOptionalId(actionButton.dataset.postId);

    if (action === "edit-topic" && topicId) {
        startTopicEdit(topicId);
    } else if (action === "delete-topic" && topicId) {
        deleteTopic(topicId);
    } else if (action === "edit-post" && postId) {
        startPostEdit(postId);
    } else if (action === "delete-post" && postId) {
        deletePost(postId);
    }
}

// Rendert alle Themenkarten inklusive der zugeordneten Beiträge.
function renderTopics() {
    if (!elements.topicList) {
        return;
    }

    if (!state.topics.length) {
        elements.topicList.innerHTML = `
            <div class="placeholder-panel">
                <p class="mb-0">Noch keine Themen vorhanden. Registriere dich oder logge dich ein, um das erste Thema zu erstellen.</p>
            </div>
        `;
        return;
    }

    elements.topicList.innerHTML = state.topics.map((topic) => {
        const topicPosts = state.posts.filter((post) => Number(post.topic?.id) === Number(topic.id));
        const authorName = topic.author?.username ?? roleLabels.GUEST;
        const createdAt = formatDate(topic.createdAt);
        const updatedAt = formatDate(topic.updatedAt);

        return `
            <article class="topic-card">
                <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
                    <div>
                        <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                            <span class="badge text-bg-light border">#${topic.id ?? "neu"}</span>
                        </div>
                        <h3 class="h4 mb-2">${escapeHtml(topic.title ?? "Ohne Titel")}</h3>
                        <p class="topic-meta mb-3">Von ${escapeHtml(authorName)} ${renderRoleBadge(topic.author?.role)} erstellt am ${createdAt}${updatedAt !== "Unbekannt" ? `, zuletzt aktualisiert ${updatedAt}` : ""}</p>
                        <p class="topic-content mb-0">${escapeHtml(topic.content ?? "")}</p>
                    </div>
                    <div class="text-md-end">
                        <div class="badge rounded-pill text-bg-primary px-3 py-2 mb-2">${topicPosts.length} Beitrag${topicPosts.length === 1 ? "" : "e"}</div>
                        ${renderTopicActions(topic)}
                    </div>
                </div>
                <hr class="my-4">
                <div class="post-list">
                    ${topicPosts.length ? topicPosts.map(renderPostCard).join("") : `
                        <div class="post-card">
                            <p class="post-meta mb-0">Noch keine Antworten zu diesem Thema.</p>
                        </div>
                    `}
                </div>
            </article>
        `;
    }).join("");
}

// Zeigt Bearbeiten/Löschen nur an, wenn der aktive Benutzer der Autor ist.
function renderTopicActions(topic) {
    if (!canManageTopic(topic)) {
        return "";
    }

    return `
        <div class="d-flex flex-wrap justify-content-md-end gap-2">
            <button class="btn btn-sm btn-outline-primary rounded-pill" type="button" data-action="edit-topic" data-topic-id="${topic.id}">Bearbeiten</button>
            <button class="btn btn-sm btn-outline-danger rounded-pill" type="button" data-action="delete-topic" data-topic-id="${topic.id}">Löschen</button>
        </div>
    `;
}

// Erstellt die HTML-Darstellung für einen einzelnen Beitrag.
function renderPostCard(post) {
    const authorName = post.author?.username ?? roleLabels.GUEST;
    const createdAt = formatDate(post.createdAt);

    return `
        <div class="post-card">
            <div class="d-flex flex-column flex-md-row justify-content-between gap-2 mb-2">
                <div>
                    <strong>${escapeHtml(authorName)}</strong>
                    ${renderRoleBadge(post.author?.role)}
                    <span class="post-meta d-block">${createdAt}</span>
                </div>
                ${renderPostActions(post)}
            </div>
            <p class="post-content mb-0">${escapeHtml(post.content ?? "")}</p>
        </div>
    `;
}

// Zeigt Beitrag-Aktionen nur für den Autor des Beitrags an.
function renderPostActions(post) {
    if (!canManagePost(post)) {
        return "";
    }

    return `
        <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-sm btn-outline-primary rounded-pill" type="button" data-action="edit-post" data-post-id="${post.id}">Bearbeiten</button>
            <button class="btn btn-sm btn-outline-danger rounded-pill" type="button" data-action="delete-post" data-post-id="${post.id}">Löschen</button>
        </div>
    `;
}

// Fehlerdarstellung, wenn Themen oder Beiträge nicht vom Backend geladen werden konnten.
function renderTopicsError(error) {
    if (!elements.topicList) {
        return;
    }

    elements.topicList.innerHTML = `
        <div class="placeholder-panel">
            <p class="fw-semibold mb-2">Themen konnten nicht geladen werden.</p>
            <p class="mb-0">${escapeHtml(formatRequestError(error))}</p>
        </div>
    `;
}

// Befüllt das Auswahlfeld im Beitragsformular mit den geladenen Themen.
function renderTopicOptions() {
    if (!elements.postTopicId) {
        return;
    }

    const selectedValue = elements.postTopicId.value;
    const defaultOption = `<option value="">Bitte Thema wählen</option>`;
    const options = state.topics.map((topic) => `
        <option value="${topic.id}">#${topic.id} - ${escapeHtml(topic.title ?? "Ohne Titel")}</option>
    `).join("");

    elements.postTopicId.innerHTML = defaultOption + options;

    if (selectedValue && state.topics.some((topic) => String(topic.id) === selectedValue)) {
        elements.postTopicId.value = selectedValue;
    }
}

// Aktualisiert die Anzeige "Aktiver Benutzer". Es wird immer nur ein aktiver User gezeigt.
function renderCurrentUser() {
    const user = state.currentUser;

    if (!user?.id) {
        if (elements.authShortcutCard) {
            elements.authShortcutCard.hidden = false;
        }

        if (elements.currentUserPanel) {
            elements.currentUserPanel.innerHTML = `
                <p class="mb-2">Noch kein Benutzer aktiv.</p>
                <p class="mb-0">Guest liest nur. User erstellt eigene Inhalte. Moderator moderiert alle Beiträge. Admin verwaltet zusätzlich alle Themen.</p>
            `;
        }

        if (elements.activeUserState) {
            elements.activeUserState.textContent = roleLabels.GUEST;
        }

        return;
    }

    if (elements.authShortcutCard) {
        elements.authShortcutCard.hidden = true;
    }

    if (elements.currentUserPanel) {
        elements.currentUserPanel.innerHTML = `
            <div class="user-summary">
                <div class="d-flex justify-content-between align-items-start gap-3">
                    <div>
                        <strong class="d-block">${escapeHtml(user.username)}</strong>
                        <span class="text-secondary">${escapeHtml(user.email ?? "Keine E-Mail")}</span>
                    </div>
                    ${renderRoleBadge(user.role)}
                </div>
                <div class="small text-secondary mt-3">Rolle: ${escapeHtml(getRoleLabel(user.role))}</div>
                <div class="small text-secondary">ID: ${escapeHtml(String(user.id))}</div>
                <button class="btn btn-outline-secondary rounded-pill mt-3 w-100" type="button" data-action="logout">Logout</button>
            </div>
        `;
    }

    if (elements.activeUserState) {
        elements.activeUserState.textContent = `${user.username} | ${getRoleLabel(user.role)}`;
    }
}

/**
 * Steuert ausschließlich die Auth-Seite nach Login oder Registrierung.
 *
 * Was diese Funktion macht:
 * - Ohne aktiven User bleibt die Registrierungskarte sichtbar.
 * - Mit aktivem User wird die Registrierungskarte ausgeblendet.
 * - Die Login-Karte zeigt dann kein Formular mehr, sondern den Status "Angemeldet".
 *
 * Warum die Pruefungen am Anfang wichtig sind:
 * app.js wird auch auf index.html geladen. Dort gibt es loginCard/registerCard nicht.
 * Der Guard verhindert deshalb JavaScript-Fehler auf Seiten ohne Auth-Elemente.
 */
function renderAuthPageState() {
    if (pageType !== "auth" || !elements.loginCard || !elements.registerCard) {
        return;
    }

    const user = state.currentUser;

    if (!user?.id) {
        if (authTemplates.loginCard) {
            elements.loginCard.innerHTML = authTemplates.loginCard;
        }
        elements.registerCard.hidden = false;
        refreshDynamicElements();
        addListener(elements.loginForm, "submit", handleLogin);
        return;
    }

    elements.registerCard.hidden = true;

    elements.loginCard.innerHTML = `
        <span class="section-label">Login</span>
        <h2 class="h4 mb-3">Angemeldet</h2>
        <p class="small text-secondary mb-3">Die Anmeldung wurde vom Backend bestaetigt. Du kannst direkt ins Forum wechseln oder dich wieder abmelden.</p>
        <div class="user-summary">
            <div class="d-flex justify-content-between align-items-start gap-3">
                <div>
                    <strong class="d-block">${escapeHtml(user.username)}</strong>
                    <span class="text-secondary">${escapeHtml(user.email ?? "Keine E-Mail")}</span>
                </div>
                ${renderRoleBadge(user.role)}
            </div>
            <div class="small text-secondary mt-3">Rolle: ${escapeHtml(getRoleLabel(user.role))}</div>
            <div class="small text-secondary">ID: ${escapeHtml(String(user.id))}</div>
        </div>
        <div class="d-grid gap-2 mt-3">
            <a class="btn btn-primary rounded-pill w-100" href="index.html">Zum Forum</a>
            <button class="btn btn-outline-secondary rounded-pill w-100" type="button" data-action="logout">Logout</button>
        </div>
    `;
    refreshDynamicElements();
}

// Aktualisiert die kleinen Zähler im Kopfbereich der Startseite.
function renderStats() {
    if (elements.topicCount) {
        elements.topicCount.textContent = String(state.topics.length);
    }

    if (elements.postCount) {
        elements.postCount.textContent = String(state.posts.length);
    }

    if (elements.activeUserState) {
        if (!state.currentUser?.id) {
            elements.activeUserState.textContent = roleLabels.GUEST;
        } else {
            elements.activeUserState.textContent = `${state.currentUser.username} | ${getRoleLabel(state.currentUser.role)}`;
        }
    }
}

// Füllt das Themenformular mit vorhandenen Daten, damit ein Thema bearbeitet werden kann.
function startTopicEdit(topicId) {
    const topic = state.topics.find((entry) => Number(entry.id) === topicId);
    if (!topic || !canManageTopic(topic) || !elements.topicId || !elements.topicTitle || !elements.topicContent || !elements.saveTopicButton || !elements.cancelTopicEditButton) {
        showAlert("warning", "Dieses Thema darfst du nicht bearbeiten.");
        return;
    }

    state.editingTopicId = topicId;
    elements.topicId.value = String(topicId);
    elements.topicTitle.value = topic.title ?? "";
    elements.topicContent.value = topic.content ?? "";
    elements.saveTopicButton.textContent = "Thema aktualisieren";
    elements.cancelTopicEditButton.classList.remove("d-none");

    const topicComposer = document.getElementById("topicComposer");
    if (topicComposer) {
        topicComposer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// Füllt  das Beitragsformular mit vorhandenen Daten, damit ein Beitrag bearbeitet werden kann.
function startPostEdit(postId) {
    const post = state.posts.find((entry) => Number(entry.id) === postId);
    if (!post || !canManagePost(post) || !elements.postId || !elements.postTopicId || !elements.postContent || !elements.savePostButton || !elements.cancelPostEditButton) {
        showAlert("warning", "Diesen Beitrag darfst du nicht bearbeiten.");
        return;
    }

    state.editingPostId = postId;
    elements.postId.value = String(postId);
    elements.postTopicId.value = String(post.topic?.id ?? "");
    elements.postContent.value = post.content ?? "";
    elements.savePostButton.textContent = "Beitrag aktualisieren";
    elements.cancelPostEditButton.classList.remove("d-none");

    const postComposer = document.getElementById("postComposer");
    if (postComposer) {
        postComposer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// Setzt das Themenformular nach Speichern oder Abbrechen wieder in den Erstellen-Modus.
function resetTopicForm() {
    state.editingTopicId = null;

    if (!elements.topicForm || !elements.topicId || !elements.saveTopicButton || !elements.cancelTopicEditButton) {
        return;
    }

    elements.topicForm.reset();
    elements.topicId.value = "";
    elements.saveTopicButton.textContent = "Thema speichern";
    elements.cancelTopicEditButton.classList.add("d-none");
}

// Setzt das Beitragsformular nach Speichern oder Abbrechen wieder in den Erstellen-Modus.
function resetPostForm() {
    state.editingPostId = null;

    if (!elements.postForm || !elements.postId || !elements.savePostButton || !elements.cancelPostEditButton) {
        return;
    }

    elements.postForm.reset();
    elements.postId.value = "";
    elements.savePostButton.textContent = "Beitrag absenden";
    elements.cancelPostEditButton.classList.add("d-none");
}

// Verhindert, dass ein Formular im Bearbeitungsmodus bleibt, wenn der Datensatz gelöscht wurde.
function syncEditorState() {
    if (state.editingTopicId && !state.topics.some((topic) => Number(topic.id) === state.editingTopicId)) {
        resetTopicForm();
    }

    if (state.editingPostId && !state.posts.some((post) => Number(post.id) === state.editingPostId)) {
        resetPostForm();
    }
}

// Löscht ein Thema nach Rückfrage und lädt danach die Forumdaten neu.
async function deleteTopic(topicId) {
    const topic = state.topics.find((entry) => Number(entry.id) === topicId);
    if (!topic || !canManageTopic(topic)) {
        showAlert("warning", "Dieses Thema darfst du nicht löschen.");
        return;
    }

    if (!window.confirm("Soll dieses Thema wirklich gelöscht werden?")) {
        return;
    }

    try {
        await requestVoid(`${endpoints.topics}/${topicId}`, {
            method: "DELETE"
        });

        if (state.editingTopicId === topicId) {
            resetTopicForm();
        }

        await loadForumData();
        showAlert("info", "Das Thema wurde gelöscht.");
    } catch (error) {
        if (expireLocalSessionIfNeeded(error)) {
            return;
        }

        showAlert("danger", `Thema konnte nicht gelöscht werden: ${formatRequestError(error)}`);
    }
}

// Löscht einen Beitrag nach Rückfrage und lädt danach die Forumdaten neu.
async function deletePost(postId) {
    const post = state.posts.find((entry) => Number(entry.id) === postId);
    if (!post || !canManagePost(post)) {
        showAlert("warning", "Diesen Beitrag darfst du nicht löschen.");
        return;
    }

    if (!window.confirm("Soll dieser Beitrag wirklich gelöscht werden?")) {
        return;
    }

    try {
        await requestVoid(`${endpoints.posts}/${postId}`, {
            method: "DELETE"
        });

        if (state.editingPostId === postId) {
            resetPostForm();
        }

        await loadForumData();
        showAlert("info", "Der Beitrag wurde gelöscht.");
    } catch (error) {
        if (expireLocalSessionIfNeeded(error)) {
            return;
        }

        showAlert("danger", `Beitrag konnte nicht gelöscht werden: ${formatRequestError(error)}`);
    }
}

// Prüft, ob der aktive Benutzer das Thema bearbeiten oder löschen darf.
function canManageTopic(topic) {
    if (!state.currentUser?.id) {
        return false;
    }

    return hasRole("ADMIN") || isAuthor(state.currentUser, topic.author);
}

// Prüft, ob der aktive Benutzer den Beitrag bearbeiten oder löschen darf.
function canManagePost(post) {
    if (!state.currentUser?.id) {
        return false;
    }

    return hasRole("ADMIN") || hasRole("MODERATOR") || isAuthor(state.currentUser, post.author);
}

function isAuthor(user, author) {
    return Number(author?.id) === Number(user?.id);
}

function hasRole(role) {
    return normalizeRole(state.currentUser?.role) === role;
}

// Schreibt einen kurzen Status in den Kopfbereich der Startseite.
function updateStatus(message) {
    if (elements.systemStatus) {
        elements.systemStatus.textContent = message;
    }
}

// Zeigt Bootstrap-Alerts für, Warnung oder Fehler an.
function showAlert(type, message) {
    if (!elements.alertHost) {
        window.alert(message);
        return;
    }

    const container = document.createElement("div");
    container.className = "alert-stack";
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show mb-0" role="alert">
            ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Schließen"></button>
        </div>
    `;

    elements.alertHost.prepend(container);
    window.setTimeout(() => {
        container.remove();
    }, 5000);
}

// führt einen Fetch aus und erwartet eine JSON-Antwort.
async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        credentials: "include",
        ...options
    });

    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(errorText || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        return null;
    }

    return response.json();
}

// führt  einen Fetch aus, wenn keine Antwortdaten benötigt werden.
async function requestVoid(url, options = {}) {
    const response = await fetch(url, {
        credentials: "include",
        ...options
    });

    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(errorText || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }
}

function resolveApiBaseUrl() {
    if (window.location.protocol === "file:") {
        return "http://localhost:8080";
    }

    return "";
}

function isBackendUnavailable(error) {
    return error?.message === "Failed to fetch" || error instanceof TypeError;
}

function formatRequestError(error) {
    if (isBackendUnavailable(error)) {
        if (window.location.protocol === "file:") {
            return "Backend nicht erreichbar. Bitte Spring Boot starten und die Seite danach neu laden.";
        }

        return "Backend nicht erreichbar.";
    }

    return error.message;
}

function expireLocalSessionIfNeeded(error) {
    const message = String(error?.message ?? "");
    const isExpired = error?.status === 401
        || message.includes("Bitte zuerst einloggen")
        || message.includes("Benutzer nicht gefunden");

    if (!isExpired) {
        return false;
    }

    state.authStateRevision += 1;
    state.currentUser = null;
    clearStoredUser();
    renderCurrentUser();
    renderAuthPageState();
    renderStats();
    showAlert("warning", "Deine lokale Anmeldung ist nicht mehr gültig. Bitte erneut einloggen.");
    return true;
}

async function syncCurrentUserFromBackend(options = {}) {
    const { strict = false } = options;
    const authStateRevision = state.authStateRevision;

    try {
        const user = await requestJson(endpoints.session);

        if (authStateRevision !== state.authStateRevision) {
            return state.currentUser;
        }

        if (user?.id) {
            const safeUser = sanitizeUser(user);
            state.currentUser = safeUser;
            persistUser(safeUser);
        } else if (strict || window.location.protocol !== "file:") {
            state.currentUser = null;
            clearStoredUser();
        }

        renderCurrentUser();
        renderAuthPageState();
        renderStats();
        return state.currentUser;
    } catch (error) {
        if (authStateRevision !== state.authStateRevision) {
            return state.currentUser;
        }

        if (!isBackendUnavailable(error)) {
            state.currentUser = null;
            clearStoredUser();
            renderCurrentUser();
            renderAuthPageState();
            renderStats();
        }

        if (strict) {
            throw error;
        }

        return state.currentUser;
    }
}

// Deaktiviert Formularfelder während eines laufenden Requests.
function setFormLoading(form, isLoading) {
    if (!form) {
        return;
    }

    const fields = form.querySelectorAll("button, input, textarea, select");
    fields.forEach((field) => {
        field.disabled = isLoading;
    });
}

// Für Backend-Beziehungen reicht im JSON die ID des Benutzers.
function buildUserReference(user) {
    return {
        id: user.id
    };
}

// Für Backend-Beziehungen reicht im JSON die ID des Themas.
function buildTopicReference(topicId) {
    return {
        id: topicId
    };
}

function normalizeRole(role) {
    return roleLabels[role] ? role : "USER";
}

function getRoleLabel(role) {
    return roleLabels[role] ?? roleLabels.USER;
}

function renderRoleBadge(role) {
    if (!role || role === "GUEST") {
        return "";
    }

    const badgeClass = role === "ADMIN"
        ? "text-bg-danger"
        : role === "MODERATOR"
            ? "text-bg-warning"
            : "text-bg-secondary";

    return `<span class="badge ${badgeClass}">${escapeHtml(getRoleLabel(role))}</span>`;
}

// Sortiert neue Themen und Beiträge nach oben.
function sortByNewest(items) {
    return [...items].sort((left, right) => {
        const leftTime = Date.parse(left.createdAt ?? 0);
        const rightTime = Date.parse(right.createdAt ?? 0);
        return rightTime - leftTime;
    });
}

// Formatiert Datumswerte deutsch und lesbar für die Oberfläche.
function formatDate(value) {
    if (!value) {
        return "Unbekannt";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

// Erstellt einen Zeitstempel im Format, das das Backend problemlos lesen kann.
function buildTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// Wandelt Formularwerte in eine gültige positive ID um.
function parseOptionalId(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// Schützt die Ausgabe vor HTML-Injektion durch Benutzereingaben.
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}

// Liest den zuletzt aktiven Benutzer aus dem Browser-Speicher.
function loadStoredUser() {
    try {
        const stored = window.localStorage.getItem(storedUserKey);
        if (stored) {
            return sanitizeUser(JSON.parse(stored));
        }
    } catch {
        // Faellt auf window.name zurueck, wenn localStorage fuer file:// unzuverlaessig ist.
    }

    try {
        const stored = loadStoredUserFromWindowName();
        return stored ? sanitizeUser(JSON.parse(stored)) : null;
    } catch {
        return null;
    }
}

// Merkt sich den aktiven Benutzer im Browser, damit er nach einem Reload erhalten bleibt.
function persistUser(user) {
    const serializedUser = JSON.stringify(user);

    try {
        window.localStorage.setItem(storedUserKey, serializedUser);
    } catch {
        // file:// kann localStorage je nach Browser blockieren oder trennen.
    }

    window.name = `${windowNameUserPrefix}${serializedUser}`;
}

function clearStoredUser() {
    try {
        window.localStorage.removeItem(storedUserKey);
    } catch {
        // Ignorieren, wenn localStorage nicht verfuegbar ist.
    }

    if (window.name.startsWith(windowNameUserPrefix)) {
        window.name = "";
    }
}

function loadStoredUserFromWindowName() {
    if (!window.name.startsWith(windowNameUserPrefix)) {
        return null;
    }

    return window.name.slice(windowNameUserPrefix.length);
}

async function finalizeAuthentication(user, successMessage) {
    state.authStateRevision += 1;
    state.currentUser = user;
    persistUser(user);
    renderCurrentUser();
    renderAuthPageState();
    renderStats();
    showAlert("success", successMessage);
}

function showStoredFlashMessage() {
    // Flash-Messages werden nicht mehr seitenübergreifend benötigt.
}

// Entfernt sensible oder unnötige Felder aus dem Benutzerobjekt des Backends.
function sanitizeUser(user) {
    if (!user) {
        return null;
    }

    const role = normalizeRole(user?.role);

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role,
        createdAt: user.createdAt
    };
}
