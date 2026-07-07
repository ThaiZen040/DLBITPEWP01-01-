// Zentraler Frontend-Zustand: geladene Forumdaten, aktiver Benutzer und Editiermodus.
const state = {
    topics: [],
    posts: [],
    currentUser: loadStoredUser(),
    editingTopicId: null,
    editingPostId: null
};

// REST-Endpunkte des Spring-Boot-Backends.
const endpoints = {
    topics: "/topics",
    posts: "/posts",
    register: "/register",
    login: "/login"
};

// Die gleiche JavaScript-Datei wird auf index.html und auth.html benutzt.
const pageType = document.body?.dataset?.page ?? "home";

// Alle wichtigen DOM-Elemente werden einmal gesammelt, damit die Funktionen lesbarer bleiben.
const elements = {
    alertHost: document.getElementById("alertHost"),
    currentUserPanel: document.getElementById("currentUserPanel"),
    activeUserState: document.getElementById("activeUserState"),
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
document.addEventListener("DOMContentLoaded", () => {
    wireEvents();
    renderCurrentUser();
    // Prueft beim Laden, ob bereits ein User im Browser gespeichert ist.
    // Falls ja, wird die Auth-Seite sofort in den Zustand "angemeldet" gesetzt.
    renderAuthPageState();
    renderStats();

    if (isForumPage()) {
        loadForumData();
    }
});

// Verbindet Buttons und Formulare mit den passenden JavaScript-Funktionen.
function wireEvents() {
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

function isForumPage() {
    return pageType === "home";
}

// Laedt Themen und Beitraege parallel vom Backend und aktualisiert danach die Oberflaeche.
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
        showAlert("danger", `Forumdaten konnten nicht geladen werden: ${error.message}`);
    }
}

// Sendet die Login-Daten an das Backend und setzt den angemeldeten Benutzer als aktiven User.
async function handleLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
        username: formData.get("username").toString().trim(),
        password: formData.get("password").toString()
    };

    try {
        setFormLoading(elements.loginForm, true);
        const user = await requestJson(endpoints.login, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const safeUser = sanitizeUser(user);
        state.currentUser = safeUser;
        persistUser(safeUser);
        renderCurrentUser();
        // Nach erfolgreichem Login wird aus dem Login-Formular eine Statusanzeige.
        // Gleichzeitig blendet renderAuthPageState() die Registrierungskarte aus.
        renderAuthPageState();
        renderStats();
        event.currentTarget.reset();
        showAlert("success", `Willkommen zurueck, ${safeUser.username}.`);
    } catch (error) {
        showAlert("danger", `Login fehlgeschlagen: ${error.message}`);
    } finally {
        setFormLoading(elements.loginForm, false);
    }
}

// Sendet Registrierungsdaten an das Backend und nutzt den neuen Benutzer direkt als aktiven User.
async function handleRegistration(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
        username: formData.get("username").toString().trim(),
        email: formData.get("email").toString().trim(),
        passwordHash: formData.get("password").toString()
    };

    try {
        setFormLoading(elements.registerForm, true);
        const user = await requestJson(endpoints.register, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const safeUser = sanitizeUser(user);
        state.currentUser = safeUser;
        persistUser(safeUser);
        renderCurrentUser();
        // Eine erfolgreiche Registrierung setzt den neuen User direkt als aktiven User.
        // Deshalb soll auch hier die Registrierung verschwinden und der Login-Status erscheinen.
        renderAuthPageState();
        renderStats();
        event.currentTarget.reset();
        showAlert("success", `Benutzer ${safeUser.username} wurde erstellt und als aktiver User gesetzt.`);
    } catch (error) {
        showAlert("danger", `Registrierung fehlgeschlagen: ${error.message}`);
    } finally {
        setFormLoading(elements.registerForm, false);
    }
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
        showAlert("danger", `Thema konnte nicht gespeichert werden: ${error.message}`);
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
        showAlert("warning", "Bitte zuerst ein Thema fuer den Beitrag auswaehlen.");
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
        showAlert("danger", `Beitrag konnte nicht gespeichert werden: ${error.message}`);
    } finally {
        setFormLoading(elements.postForm, false);
    }
}

// Wertet Klicks in der Themenliste aus, z. B. Bearbeiten oder Loeschen.
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

// Rendert alle Themenkarten inklusive der zugeordneten Beitraege.
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
        const authorName = topic.author?.username ?? "Gast";
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
                        <p class="topic-meta mb-3">Von ${escapeHtml(authorName)} erstellt am ${createdAt}${updatedAt !== "Unbekannt" ? `, zuletzt aktualisiert ${updatedAt}` : ""}</p>
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

// Zeigt Bearbeiten/Loeschen nur an, wenn der aktive Benutzer der Autor ist.
function renderTopicActions(topic) {
    if (!canManageTopic(topic)) {
        return "";
    }

    return `
        <div class="d-flex flex-wrap justify-content-md-end gap-2">
            <button class="btn btn-sm btn-outline-primary rounded-pill" type="button" data-action="edit-topic" data-topic-id="${topic.id}">Bearbeiten</button>
            <button class="btn btn-sm btn-outline-danger rounded-pill" type="button" data-action="delete-topic" data-topic-id="${topic.id}">Loeschen</button>
        </div>
    `;
}

// Erstellt die HTML-Darstellung für einen einzelnen Beitrag.
function renderPostCard(post) {
    const authorName = post.author?.username ?? "Gast";
    const createdAt = formatDate(post.createdAt);

    return `
        <div class="post-card">
            <div class="d-flex flex-column flex-md-row justify-content-between gap-2 mb-2">
                <div>
                    <strong>${escapeHtml(authorName)}</strong>
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
            <button class="btn btn-sm btn-outline-danger rounded-pill" type="button" data-action="delete-post" data-post-id="${post.id}">Loeschen</button>
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
            <p class="mb-0">${escapeHtml(error.message)}</p>
        </div>
    `;
}

// Befüllt das Auswahlfeld im Beitragsformular mit den geladenen Themen.
function renderTopicOptions() {
    if (!elements.postTopicId) {
        return;
    }

    const selectedValue = elements.postTopicId.value;
    const defaultOption = `<option value="">Bitte Thema waehlen</option>`;
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
        if (elements.currentUserPanel) {
            elements.currentUserPanel.innerHTML = `
                <p class="mb-2">Noch kein Benutzer aktiv.</p>
                <p class="mb-0">Gaeste duerfen das Forum lesen. Mit Login oder Registrierung werden Themen und Beitraege bearbeitbar.</p>
            `;
        }

        if (elements.activeUserState) {
            elements.activeUserState.textContent = "Gast";
        }

        return;
    }

    if (elements.currentUserPanel) {
        elements.currentUserPanel.innerHTML = `
            <div class="user-summary">
                <div class="d-flex justify-content-between align-items-start gap-3">
                    <div>
                        <strong class="d-block">${escapeHtml(user.username)}</strong>
                        <span class="text-secondary">${escapeHtml(user.email ?? "Keine E-Mail")}</span>
                    </div>
                </div>
                <div class="small text-secondary mt-3">ID: ${escapeHtml(String(user.id))}</div>
            </div>
        `;
    }

    if (elements.activeUserState) {
        elements.activeUserState.textContent = user.username;
    }
}

/**
 * Steuert ausschliesslich die Auth-Seite nach Login oder Registrierung.
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

    // Kein User im State bedeutet: Gastmodus. Login und Registrierung bleiben nutzbar.
    if (!user?.id) {
        elements.registerCard.hidden = false;
        return;
    }

    // Sobald ein User angemeldet ist, soll keine zweite Registrierung angezeigt werden.
    elements.registerCard.hidden = true;

    // Die Werte koennen aus dem Backend oder aus localStorage kommen.
    // escapeHtml verhindert, dass Benutzerdaten als HTML ausgefuehrt werden.
    elements.loginCard.innerHTML = `
        <span class="section-label">Login</span>
        <h2 class="h4 mb-3">Angemeldet</h2>
        <p class="small text-secondary mb-3">Du bist aktuell angemeldet.</p>
        <div class="user-summary">
            <strong class="d-block">${escapeHtml(user.username)}</strong>
            <span class="text-secondary">${escapeHtml(user.email ?? "Keine E-Mail")}</span>
            <div class="small text-secondary mt-3">ID: ${escapeHtml(String(user.id))}</div>
        </div>
        <a class="btn btn-primary rounded-pill mt-3 w-100" href="index.html">Zum Forum</a>
    `;
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
        elements.activeUserState.textContent = state.currentUser?.username ?? "Gast";
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
        showAlert("warning", "Dieses Thema darfst du nicht loeschen.");
        return;
    }

    if (!window.confirm("Soll dieses Thema wirklich geloescht werden?")) {
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
        showAlert("info", "Das Thema wurde geloescht.");
    } catch (error) {
        showAlert("danger", `Thema konnte nicht geloescht werden: ${error.message}`);
    }
}

// Löscht einen Beitrag nach Rückfrage und lädt danach die Forumdaten neu.
async function deletePost(postId) {
    const post = state.posts.find((entry) => Number(entry.id) === postId);
    if (!post || !canManagePost(post)) {
        showAlert("warning", "Diesen Beitrag darfst du nicht loeschen.");
        return;
    }

    if (!window.confirm("Soll dieser Beitrag wirklich geloescht werden?")) {
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
        showAlert("info", "Der Beitrag wurde geloescht.");
    } catch (error) {
        showAlert("danger", `Beitrag konnte nicht geloescht werden: ${error.message}`);
    }
}

// Prüf, ob der aktive Benutzer das Thema bearbeiten oder loeschen darf.
function canManageTopic(topic) {
    return canManageEntity(topic.author);
}

// Prüf, ob der aktive Benutzer den Beitrag bearbeiten oder loeschen darf.
function canManagePost(post) {
    return canManageEntity(post.author);
}

// Der Benutzer darf nur eigene Inhalte verwalten.
function canManageEntity(author) {
    if (!state.currentUser?.id) {
        return false;
    }

    return Number(author?.id) === Number(state.currentUser.id);
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
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Schliessen"></button>
        </div>
    `;

    elements.alertHost.prepend(container);
    window.setTimeout(() => {
        container.remove();
    }, 5000);
}

// führt einen Fetch aus und erwartet eine JSON-Antwort.
async function requestJson(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        return null;
    }

    return response.json();
}

// führt  einen Fetch aus, wenn keine Antwortdaten benoetigt werden.
async function requestVoid(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
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
        const stored = window.localStorage.getItem("webforum-current-user");
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

// Merkt sich den aktiven Benutzer im Browser, damit er nach einem Reload erhalten bleibt.
function persistUser(user) {
    window.localStorage.setItem("webforum-current-user", JSON.stringify(user));
}

// Entfernt sensible oder unnötige Felder aus dem Benutzerobjekt des Backends.
function sanitizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
    };
}
