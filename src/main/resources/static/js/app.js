const state = {
    topics: [],
    posts: [],
    currentUser: loadStoredUser(),
    editingTopicId: null,
    editingPostId: null
};

const apiBaseUrl = resolveApiBaseUrl();

const endpoints = {
    topics: buildEndpointUrl("topics"),
    posts: buildEndpointUrl("posts"),
    register: buildEndpointUrl("register"),
    login: buildEndpointUrl("login")
};

const pageType = document.body?.dataset?.page ?? "home";

const elements = {
    alertHost: document.getElementById("alertHost"),
    currentUserPanel: document.getElementById("currentUserPanel"),
    activeUserState: document.getElementById("activeUserState"),
    loadTopicsButton: document.getElementById("loadTopicsButton"),
    refreshButton: document.getElementById("refreshButton"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    topicForm: document.getElementById("topicForm"),
    postForm: document.getElementById("postForm"),
    topicList: document.getElementById("topicList"),
    topicCount: document.getElementById("topicCount"),
    postCount: document.getElementById("postCount"),
    topicId: document.getElementById("topicId"),
    topicTitle: document.getElementById("topicTitle"),
    topicContent: document.getElementById("topicContent"),
    topicClosed: document.getElementById("topicClosed"),
    saveTopicButton: document.getElementById("saveTopicButton"),
    cancelTopicEditButton: document.getElementById("cancelTopicEditButton"),
    postId: document.getElementById("postId"),
    postTopicId: document.getElementById("postTopicId"),
    postContent: document.getElementById("postContent"),
    savePostButton: document.getElementById("savePostButton"),
    cancelPostEditButton: document.getElementById("cancelPostEditButton"),
    systemStatus: document.getElementById("systemStatus")
};

document.addEventListener("DOMContentLoaded", () => {
    wireEvents();
    renderCurrentUser();
    renderStats();

    if (isForumPage()) {
        loadForumData();
    }
});

function wireEvents() {
    addListener(elements.loadTopicsButton, "click", loadForumData);
    addListener(elements.refreshButton, "click", loadForumData);
    addListener(elements.loginForm, "submit", handleLogin);
    addListener(elements.registerForm, "submit", handleRegistration);
    addListener(elements.topicForm, "submit", handleTopicSubmit);
    addListener(elements.postForm, "submit", handlePostSubmit);
    addListener(elements.cancelTopicEditButton, "click", resetTopicForm);
    addListener(elements.cancelPostEditButton, "click", resetPostForm);
    addListener(elements.topicList, "click", handleTopicListClick);
}

function addListener(element, eventName, handler) {
    if (element) {
        element.addEventListener(eventName, handler);
    }
}

function isForumPage() {
    return pageType === "home";
}

function isAuthPage() {
    return pageType === "auth";
}

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
        renderStats();
        event.currentTarget.reset();
        showAlert("success", isAuthPage()
            ? `Willkommen zurueck, ${safeUser.username}. Du wirst jetzt zum Forum weitergeleitet.`
            : `Willkommen zurueck, ${safeUser.username}.`);
        redirectToForumAfterAuth();
    } catch (error) {
        showAlert("danger", `Login fehlgeschlagen: ${error.message}`);
    } finally {
        setFormLoading(elements.loginForm, false);
    }
}

async function handleRegistration(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = {
        username: formData.get("username").toString().trim(),
        email: formData.get("email").toString().trim(),
        passwordHash: formData.get("password").toString(),
        role: formData.get("role").toString()
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
        renderStats();
        event.currentTarget.reset();
        showAlert("success", isAuthPage()
            ? `Benutzer ${safeUser.username} wurde erstellt. Du wirst jetzt zum Forum weitergeleitet.`
            : `Benutzer ${safeUser.username} wurde erstellt und als aktiver User gesetzt.`);
        redirectToForumAfterAuth();
    } catch (error) {
        showAlert("danger", `Registrierung fehlgeschlagen: ${error.message}`);
    } finally {
        setFormLoading(elements.registerForm, false);
    }
}

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
        updatedAt: timestamp,
        closed: formData.get("closed") === "on"
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
        const statusClass = topic.closed ? "text-bg-secondary" : "text-bg-success";
        const statusText = topic.closed ? "Geschlossen" : "Offen";

        return `
            <article class="topic-card">
                <div class="d-flex flex-column flex-md-row justify-content-between gap-3">
                    <div>
                        <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                            <span class="badge ${statusClass}">${statusText}</span>
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
                    <span class="badge text-bg-primary">${escapeHtml(user.role ?? "USER")}</span>
                </div>
                <div class="small text-secondary mt-3">ID: ${escapeHtml(String(user.id))}</div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill mt-3" id="logoutButton">Logout</button>
        `;

        const logoutButton = document.getElementById("logoutButton");
        if (logoutButton) {
            logoutButton.addEventListener("click", logoutCurrentUser);
        }
    }

    if (elements.activeUserState) {
        elements.activeUserState.textContent = user.username;
    }
}

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

function startTopicEdit(topicId) {
    const topic = state.topics.find((entry) => Number(entry.id) === topicId);
    if (!topic || !canManageTopic(topic) || !elements.topicId || !elements.topicTitle || !elements.topicContent || !elements.topicClosed || !elements.saveTopicButton || !elements.cancelTopicEditButton) {
        showAlert("warning", "Dieses Thema darfst du nicht bearbeiten.");
        return;
    }

    state.editingTopicId = topicId;
    elements.topicId.value = String(topicId);
    elements.topicTitle.value = topic.title ?? "";
    elements.topicContent.value = topic.content ?? "";
    elements.topicClosed.checked = Boolean(topic.closed);
    elements.saveTopicButton.textContent = "Thema aktualisieren";
    elements.cancelTopicEditButton.classList.remove("d-none");

    const topicComposer = document.getElementById("topicComposer");
    if (topicComposer) {
        topicComposer.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

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

function syncEditorState() {
    if (state.editingTopicId && !state.topics.some((topic) => Number(topic.id) === state.editingTopicId)) {
        resetTopicForm();
    }

    if (state.editingPostId && !state.posts.some((post) => Number(post.id) === state.editingPostId)) {
        resetPostForm();
    }
}

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

function logoutCurrentUser() {
    state.currentUser = null;
    clearStoredUser();
    resetTopicForm();
    resetPostForm();
    renderCurrentUser();
    renderStats();
    showAlert("info", "Du wurdest abgemeldet.");
}

function canManageTopic(topic) {
    return canManageEntity(topic.author);
}

function canManagePost(post) {
    return canManageEntity(post.author);
}

function canManageEntity(author) {
    if (!state.currentUser?.id) {
        return false;
    }

    if (isPrivilegedUser(state.currentUser)) {
        return true;
    }

    return Number(author?.id) === Number(state.currentUser.id);
}

function isPrivilegedUser(user) {
    return user?.role === "ADMIN" || user?.role === "MODERATOR";
}

function updateStatus(message) {
    if (elements.systemStatus) {
        elements.systemStatus.textContent = message;
    }
}

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

async function requestJson(url, options = {}) {
    const response = await performRequest(url, options);

    if (!response.ok) {
        throw new Error(await buildRequestErrorMessage(response, url));
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
        return null;
    }

    return response.json();
}

async function requestVoid(url, options = {}) {
    const response = await performRequest(url, options);

    if (!response.ok) {
        throw new Error(await buildRequestErrorMessage(response, url));
    }
}

function setFormLoading(form, isLoading) {
    if (!form) {
        return;
    }

    const fields = form.querySelectorAll("button, input, textarea, select");
    fields.forEach((field) => {
        field.disabled = isLoading;
    });
}

function redirectToForumAfterAuth() {
    if (!isAuthPage()) {
        return;
    }

    window.setTimeout(() => {
        window.location.assign("index.html");
    }, 900);
}

function buildEndpointUrl(path) {
    return new URL(path, `${apiBaseUrl}/`).toString();
}

function resolveApiBaseUrl() {
    const { protocol, hostname, port, origin } = window.location;

    if ((hostname === "localhost" || hostname === "127.0.0.1") && port && port !== "8080") {
        return `${protocol}//${hostname}:8080`;
    }

    return origin;
}

async function performRequest(url, options = {}) {
    try {
        return await fetch(url, options);
    } catch (error) {
        throw new Error(buildNetworkErrorMessage(url, error));
    }
}

async function buildRequestErrorMessage(response, url) {
    const responseText = await response.text();
    const contentType = response.headers.get("content-type") ?? "";

    if (response.status === 404) {
        return buildNotFoundMessage(url, responseText, contentType);
    }

    if (contentType.includes("text/html")) {
        return `Der Server hat statt JSON eine HTML-Seite zurueckgegeben (HTTP ${response.status}). Bitte pruefe, ob das Frontend ueber die Spring-Boot-App unter http://localhost:8080 laeuft.`;
    }

    return responseText || `HTTP ${response.status}`;
}

function buildNotFoundMessage(url, responseText, contentType) {
    const requestedPath = safePathname(url);
    const currentLocation = `${window.location.origin}${window.location.pathname}`;

    if (contentType.includes("text/html")) {
        return `API-Endpunkt ${requestedPath} wurde nicht gefunden. Oeffne das Frontend ueber die Spring-Boot-Anwendung unter http://localhost:8080 und nicht ueber einen reinen HTML-Preview. Aktuell geoeffnet: ${currentLocation}`;
    }

    return responseText || `API-Endpunkt ${requestedPath} wurde nicht gefunden.`;
}

function buildNetworkErrorMessage(url, error) {
    const apiOrigin = safeOrigin(url);
    const fallback = "Die API ist nicht erreichbar. Bitte pruefe, ob die Spring-Boot-App auf http://localhost:8080 laeuft.";

    if (!apiOrigin) {
        return error?.message || fallback;
    }

    return `Die API unter ${apiOrigin} ist nicht erreichbar. Bitte pruefe, ob die Spring-Boot-App auf http://localhost:8080 laeuft.`;
}

function safePathname(url) {
    try {
        return new URL(url, document.baseURI).pathname;
    } catch {
        return String(url);
    }
}

function safeOrigin(url) {
    try {
        return new URL(url, document.baseURI).origin;
    } catch {
        return "";
    }
}

function buildUserReference(user) {
    return {
        id: user.id
    };
}

function buildTopicReference(topicId) {
    return {
        id: topicId
    };
}

function sortByNewest(items) {
    return [...items].sort((left, right) => {
        const leftTime = Date.parse(left.createdAt ?? 0);
        const rightTime = Date.parse(right.createdAt ?? 0);
        return rightTime - leftTime;
    });
}

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

function parseOptionalId(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}

function loadStoredUser() {
    try {
        const stored = window.localStorage.getItem("webforum-current-user");
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

function persistUser(user) {
    window.localStorage.setItem("webforum-current-user", JSON.stringify(user));
}

function clearStoredUser() {
    window.localStorage.removeItem("webforum-current-user");
}

function sanitizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
    };
}
