(() => {
    const STORAGE_KEY = "keepit_passwords_v1";

    const navLinks = Array.from(document.querySelectorAll(".js-nav-link"));
    const views = {
        home: document.getElementById("view-home"),
        add: document.getElementById("view-add"),
        manager: document.getElementById("view-manager"),
    };

    const addForm = document.getElementById("addPasswordForm");
    const passwordList = document.getElementById("passwordList");
    const passwordCount = document.getElementById("passwordCount");
    const editorPlaceholder = document.getElementById("editorPlaceholder");
    const editForm = document.getElementById("editPasswordForm");
    const editPasswordId = document.getElementById("editPasswordId");
    const editSiteUrl = document.getElementById("editSiteUrl");
    const editSiteUsername = document.getElementById("editSiteUsername");
    const editSitePassword = document.getElementById("editSitePassword");
    const toggleEditPassword = document.getElementById("toggleEditPassword");
    const deleteFromEditor = document.getElementById("deleteFromEditor");
    const saveChangesButton = document.getElementById("saveChangesButton");

    const homePasswordList = document.getElementById("homePasswordList");
    const homePasswordCount = document.getElementById("homePasswordCount");
    const homeEmpty = document.getElementById("homeEmpty");
    const homePrev = document.getElementById("homePrev");
    const homeNext = document.getElementById("homeNext");

    const generatePasswordButton = document.getElementById("generatePasswordButton");
    const generatedPasswordValue = document.getElementById("generatedPasswordValue");
    const saveGeneratedPassword = document.getElementById("saveGeneratedPassword");
    const deleteGeneratedPassword = document.getElementById("deleteGeneratedPassword");
    const sitePasswordInput = document.getElementById("sitePassword");

    const settingsModalEl = document.getElementById("settingsModal");
    const exportCsvButton = document.getElementById("exportCsvButton");
    const importCsvButton = document.getElementById("importCsvButton");
    const importCsvInput = document.getElementById("importCsvInput");
    const clearDataConfirmInput = document.getElementById("clearDataConfirmInput");
    const clearDataButton = document.getElementById("clearDataButton");

    const sitePopupEl = document.getElementById("sitePopup");
    const sitePopupTitle = document.getElementById("sitePopupTitle");
    const sitePopupMessage = document.getElementById("sitePopupMessage");
    const sitePopupConfirm = document.getElementById("sitePopupConfirm");
    const sitePopupCancel = document.getElementById("sitePopupCancel");

    let passwords = loadPasswords();
    let selectedPasswordId = null;
    let isEditPasswordVisible = false;

    let sitePopup = null;
    let settingsModal = null;
    let popupResolver = null;
    let popupDecision = null;
    let isHomeDragging = false;
    let homeDragStartX = 0;
    let homeDragStartScroll = 0;
    let suppressHomeCardClick = false;
    let generatedPassword = "";

    function generateId() {
        return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function clean(value) {
        return String(value || "").trim();
    }

    function loadPasswords() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed
                .map((item) => ({
                    id: String(item?.id ?? generateId()),
                    url: clean(item?.url),
                    username: clean(item?.username ?? item?.Username ?? item?.name),
                    password: clean(item?.password),
                }))
                .filter((item) => item.url && item.username && item.password);
        } catch (error) {
            return [];
        }
    }

    function persistPasswords() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
    }

    function shortText(value, maxLength = 42) {
        if (value.length <= maxLength) {
            return value;
        }

        return `${value.slice(0, maxLength - 3)}...`;
    }

    function getHostname(url) {
        try {
            return new URL(url).hostname.replace(/^www\./i, "");
        } catch (error) {
            return clean(url).replace(/^https?:\/\//i, "").split("/")[0];
        }
    }

    function getSiteName(url) {
        const host = getHostname(url);
        if (!host) {
            return "Unknown Site";
        }

        const base = host.split(".")[0] || host;
        return base.charAt(0).toUpperCase() + base.slice(1);
    }

    function getFaviconUrl(url) {
        const hostname = getHostname(url);
        if (!hostname) {
            return "";
        }

        return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`;
    }

    function createSiteLogoElement(url, username) {
        const wrap = document.createElement("div");
        wrap.className = "site-logo-wrap";

        const fallback = document.createElement("span");
        fallback.className = "site-logo-fallback d-none";
        fallback.textContent = (username || getHostname(url) || "?").trim().charAt(0).toUpperCase() || "?";

        const faviconUrl = getFaviconUrl(url);
        if (!faviconUrl) {
            fallback.classList.remove("d-none");
            wrap.appendChild(fallback);
            return wrap;
        }

        const img = document.createElement("img");
        img.className = "site-logo";
        img.src = faviconUrl;
        img.alt = `${getHostname(url) || username || "site"} logo`;
        img.loading = "lazy";

        img.addEventListener("error", () => {
            img.classList.add("d-none");
            fallback.classList.remove("d-none");
        });

        wrap.appendChild(img);
        wrap.appendChild(fallback);
        return wrap;
    }

    function getPasswordById(id) {
        return passwords.find((item) => String(item.id) === String(id));
    }

    function getPasswordIndexById(id) {
        return passwords.findIndex((item) => String(item.id) === String(id));
    }

    function setEditorPlaceholder(text) {
        if (editorPlaceholder) {
            editorPlaceholder.textContent = text;
        }
    }

    function setActiveNav(viewName) {
        navLinks.forEach((link) => {
            const isActive = link.dataset.view === viewName;
            link.classList.toggle("active", isActive);
            link.setAttribute("aria-current", isActive ? "page" : "false");
        });
    }

    function closeMobileNavbar() {
        const collapseEl = document.getElementById("navbarNav");
        if (!collapseEl || !collapseEl.classList.contains("show")) {
            return;
        }

        if (window.bootstrap && window.bootstrap.Collapse) {
            window.bootstrap.Collapse.getOrCreateInstance(collapseEl).hide();
        }
    }

    function disableInputSuggestions() {
        const fields = Array.from(document.querySelectorAll("input, textarea"));
        fields.forEach((field) => {
            field.setAttribute("autocomplete", "off");
            field.setAttribute("autocorrect", "off");
            field.setAttribute("autocapitalize", "off");
            field.setAttribute("spellcheck", "false");
            if (field.tagName === "INPUT") {
                field.setAttribute("name", `no_suggest_${field.id || Math.random().toString(36).slice(2, 8)}`);
            }
        });
    }

    function updateGeneratorUI() {
        if (!generatedPasswordValue || !saveGeneratedPassword || !deleteGeneratedPassword) {
            return;
        }

        if (!generatedPassword) {
            generatedPasswordValue.textContent = "No password generated yet.";
            saveGeneratedPassword.disabled = true;
            deleteGeneratedPassword.disabled = true;
            return;
        }

        generatedPasswordValue.textContent = generatedPassword;
        saveGeneratedPassword.disabled = false;
        deleteGeneratedPassword.disabled = false;
    }

    function generateStrongPassword(length = 16) {
        const lowers = "abcdefghijklmnopqrstuvwxyz";
        const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const digits = "0123456789";
        const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        const all = lowers + uppers + digits + symbols;

        const picks = [
            lowers[Math.floor(Math.random() * lowers.length)],
            uppers[Math.floor(Math.random() * uppers.length)],
            digits[Math.floor(Math.random() * digits.length)],
            symbols[Math.floor(Math.random() * symbols.length)],
        ];

        while (picks.length < length) {
            picks.push(all[Math.floor(Math.random() * all.length)]);
        }

        for (let i = picks.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [picks[i], picks[j]] = [picks[j], picks[i]];
        }

        return picks.join("");
    }

    function switchView(viewName) {
        Object.entries(views).forEach(([name, element]) => {
            if (!element) {
                return;
            }
            element.classList.toggle("d-none", name !== viewName);
        });

        setActiveNav(viewName);

        if (viewName === "manager") {
            renderPasswords();
        }
    }

    function initPopup() {
        if (!sitePopupEl || !window.bootstrap || !window.bootstrap.Modal) {
            return;
        }

        sitePopup = window.bootstrap.Modal.getOrCreateInstance(sitePopupEl);

        if (sitePopupConfirm) {
            sitePopupConfirm.addEventListener("click", () => {
                popupDecision = true;
                sitePopup.hide();
            });
        }

        if (sitePopupCancel) {
            sitePopupCancel.addEventListener("click", () => {
                popupDecision = false;
                sitePopup.hide();
            });
        }

        sitePopupEl.addEventListener("hidden.bs.modal", () => {
            if (!popupResolver) {
                popupDecision = null;
                return;
            }

            const decision = popupDecision === null ? false : popupDecision;
            const resolve = popupResolver;
            popupResolver = null;
            popupDecision = null;
            resolve(decision);
        });
    }

    function showPopup({ title, message, confirmText = "OK", cancelText = "Cancel", showCancel = false, danger = false }) {
        if (!sitePopup || !sitePopupTitle || !sitePopupMessage || !sitePopupConfirm || !sitePopupCancel) {
            return Promise.resolve(showCancel ? false : true);
        }

        if (popupResolver) {
            const resolve = popupResolver;
            popupResolver = null;
            resolve(false);
        }

        sitePopupTitle.textContent = title;
        sitePopupMessage.textContent = message;

        sitePopupConfirm.textContent = confirmText;
        sitePopupCancel.textContent = cancelText;
        sitePopupCancel.classList.toggle("d-none", !showCancel);

        sitePopupConfirm.classList.toggle("btn-danger", danger);
        sitePopupConfirm.classList.toggle("btn-success", !danger);

        popupDecision = null;
        return new Promise((resolve) => {
            popupResolver = resolve;
            sitePopup.show();
        });
    }

    function escapeCsvValue(value) {
        const raw = String(value ?? "");
        if (/[,\"\n\r]/.test(raw)) {
            return `"${raw.replace(/"/g, '""')}"`;
        }
        return raw;
    }

    function buildCsvContent(entries) {
        const lines = ["url,username,password"];
        entries.forEach((entry) => {
            lines.push([
                escapeCsvValue(entry.url),
                escapeCsvValue(entry.username),
                escapeCsvValue(entry.password),
            ].join(","));
        });
        return lines.join("\n");
    }

    function parseCsv(textValue) {
        const rows = [];
        let row = [];
        let field = "";
        let inQuotes = false;

        for (let i = 0; i < textValue.length; i += 1) {
            const char = textValue[i];

            if (char === '"') {
                if (inQuotes && textValue[i + 1] === '"') {
                    field += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === "," && !inQuotes) {
                row.push(field);
                field = "";
                continue;
            }

            if ((char === "\n" || char === "\r") && !inQuotes) {
                if (char === "\r" && textValue[i + 1] === "\n") {
                    i += 1;
                }
                row.push(field);
                field = "";
                if (row.some((cell) => String(cell).trim() !== "")) {
                    rows.push(row);
                }
                row = [];
                continue;
            }

            field += char;
        }

        if (field.length > 0 || row.length > 0) {
            row.push(field);
            if (row.some((cell) => String(cell).trim() !== "")) {
                rows.push(row);
            }
        }

        return rows;
    }

    function buildAccountKey(url, username, password) {
        return [
            normalizeUrlForCompare(url),
            normalizeUsernameForCompare(username),
            normalizePasswordForCompare(password),
        ].join("|");
    }

    function updateClearDataState() {
        if (!clearDataButton || !clearDataConfirmInput) {
            return;
        }

        clearDataButton.disabled = clean(clearDataConfirmInput.value).toUpperCase() !== "CLEAR DATA";
    }

    function resetSettingsDangerState() {
        if (clearDataConfirmInput) {
            clearDataConfirmInput.value = "";
        }
        updateClearDataState();
    }

    async function hideSettingsModalForPopup() {
        if (!settingsModal || !settingsModalEl || !settingsModalEl.classList.contains("show")) {
            return false;
        }

        await new Promise((resolve) => {
            const onHidden = () => {
                settingsModalEl.removeEventListener("hidden.bs.modal", onHidden);
                resolve();
            };
            settingsModalEl.addEventListener("hidden.bs.modal", onHidden);
            settingsModal.hide();
        });

        return true;
    }

    async function onExportCsv() {
        const csv = buildCsvContent(passwords);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const datePart = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `keepit-passwords-${datePart}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function onImportCsvClick() {
        if (!importCsvInput) {
            return;
        }
        importCsvInput.click();
    }

    async function onImportCsvChange(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }

        try {
            const raw = await file.text();
            const rows = parseCsv(raw);
            if (rows.length < 2) {
                await showPopup({
                    title: "Import Failed",
                    message: "CSV must include header and at least one row.",
                    confirmText: "OK",
                    showCancel: false,
                });
                return;
            }

            const header = rows[0].map((h) => clean(h).toLowerCase());
            const urlIndex = header.indexOf("url");
            const usernameIndex = header.indexOf("username");
            const passwordIndex = header.indexOf("password");

            if (urlIndex === -1 || usernameIndex === -1 || passwordIndex === -1) {
                await showPopup({
                    title: "Import Failed",
                    message: "CSV headers must be: url, username, password.",
                    confirmText: "OK",
                    showCancel: false,
                });
                return;
            }

            const existingKeys = new Set(passwords.map((entry) => buildAccountKey(entry.url, entry.username, entry.password)));
            const imported = [];
            let skippedInvalid = 0;
            let skippedDuplicate = 0;

            for (let i = 1; i < rows.length; i += 1) {
                const row = rows[i];
                const url = clean(row[urlIndex]);
                const username = clean(row[usernameIndex]);
                const password = clean(row[passwordIndex]);

                if (validatePasswordFields(url, username, password)) {
                    skippedInvalid += 1;
                    continue;
                }

                const key = buildAccountKey(url, username, password);
                if (existingKeys.has(key)) {
                    skippedDuplicate += 1;
                    continue;
                }

                existingKeys.add(key);
                imported.push({
                    id: generateId(),
                    url,
                    username,
                    password,
                });
            }

            if (imported.length > 0) {
                passwords = [...imported, ...passwords];
                persistPasswords();
                renderPasswords();
            }

            await showPopup({
                title: "Import Complete",
                message: `Imported: ${imported.length} | Invalid: ${skippedInvalid} | Duplicates: ${skippedDuplicate}`,
                confirmText: "OK",
                showCancel: false,
            });
        } catch (error) {
            await showPopup({
                title: "Import Failed",
                message: "Could not read this CSV file.",
                confirmText: "OK",
                showCancel: false,
            });
        } finally {
            if (importCsvInput) {
                importCsvInput.value = "";
            }
        }
    }

    async function onClearAllData() {
        if (clean(clearDataConfirmInput?.value).toUpperCase() !== "CLEAR DATA") {
            updateClearDataState();
            return;
        }

        const hadOpenSettings = await hideSettingsModalForPopup();

        const confirmed = await showPopup({
            title: "Clear All Data",
            message: "Are you sure? This cannot be undone.",
            confirmText: "Clear",
            cancelText: "Cancel",
            showCancel: true,
            danger: true,
        });

        if (!confirmed) {
            if (hadOpenSettings && settingsModal) {
                settingsModal.show();
            }
            return;
        }

        passwords = [];
        selectedPasswordId = null;
        generatedPassword = "";
        persistPasswords();
        renderPasswords();
        resetEditorState();
        updateGeneratorUI();
        if (addForm) {
            addForm.reset();
        }
        resetSettingsDangerState();
    }

    function initSettingsModal() {
        if (!settingsModalEl || !window.bootstrap || !window.bootstrap.Modal) {
            return;
        }

        settingsModal = window.bootstrap.Modal.getOrCreateInstance(settingsModalEl);
        settingsModalEl.addEventListener("hidden.bs.modal", resetSettingsDangerState);
    }

    function validatePasswordFields(url, username, password) {
        if (!url || !username || !password) {
            return "All fields are required.";
        }

        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                return "URL must start with http:// or https://.";
            }
        } catch (error) {
            return "URL format is invalid.";
        }

        return "";
    }

    function normalizeUrlForCompare(rawUrl) {
        const value = clean(rawUrl);
        try {
            const parsed = new URL(value);
            const protocol = parsed.protocol.toLowerCase();
            const hostname = parsed.hostname.toLowerCase();
            const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
            return `${protocol}//${hostname}${pathname}${parsed.search}`;
        } catch (error) {
            return value.replace(/\/+$/, "").toLowerCase();
        }
    }

    function normalizeUsernameForCompare(rawUsername) {
        return clean(rawUsername).toLowerCase();
    }

    function normalizePasswordForCompare(rawPassword) {
        return clean(rawPassword);
    }

    function isDuplicateAccount(url, username, password, excludeId = null) {
        const targetUrl = normalizeUrlForCompare(url);
        const targetUsername = normalizeUsernameForCompare(username);
        const targetPassword = normalizePasswordForCompare(password);

        return passwords.some((entry) => {
            if (excludeId !== null && String(entry.id) === String(excludeId)) {
                return false;
            }

            return (
                normalizeUrlForCompare(entry.url) === targetUrl &&
                normalizeUsernameForCompare(entry.username) === targetUsername &&
                normalizePasswordForCompare(entry.password) === targetPassword
            );
        });
    }

    function getEditValues() {
        return {
            url: clean(editSiteUrl?.value),
            username: clean(editSiteUsername?.value),
            password: clean(editSitePassword?.value),
        };
    }

    function hasEditorChanges() {
        if (!selectedPasswordId) {
            return false;
        }

        const selected = getPasswordById(selectedPasswordId);
        if (!selected) {
            return false;
        }

        const current = getEditValues();
        return current.url !== selected.url || current.username !== selected.username || current.password !== selected.password;
    }

    function updateSaveChangesState() {
        if (!saveChangesButton) {
            return;
        }

        const current = getEditValues();
        const validationError = validatePasswordFields(current.url, current.username, current.password);
        const hasDuplicate = selectedPasswordId
            ? isDuplicateAccount(current.url, current.username, current.password, selectedPasswordId)
            : false;

        saveChangesButton.disabled = !hasEditorChanges() || Boolean(validationError) || hasDuplicate;
    }

    function updateHomeSliderControls() {
        if (!homePasswordList || !homePrev || !homeNext) {
            return;
        }

        const maxScroll = Math.max(0, homePasswordList.scrollWidth - homePasswordList.clientWidth);
        const hasOverflow = maxScroll > 1;

        homePrev.disabled = !hasOverflow || homePasswordList.scrollLeft <= 2;
        homeNext.disabled = !hasOverflow || homePasswordList.scrollLeft >= maxScroll - 2;
    }

    function scrollHomePasswords(direction) {
        if (!homePasswordList) {
            return;
        }

        const step = Math.max(220, Math.floor(homePasswordList.clientWidth * 0.75));
        homePasswordList.scrollBy({ left: direction * step, behavior: "smooth" });
        window.setTimeout(updateHomeSliderControls, 220);
    }

    function onHomePointerDown(event) {
        if (!homePasswordList || event.button !== 0) {
            return;
        }

        isHomeDragging = true;
        suppressHomeCardClick = false;
        homeDragStartX = event.clientX;
        homeDragStartScroll = homePasswordList.scrollLeft;
        homePasswordList.classList.add("is-dragging");
        event.preventDefault();
    }

    function onHomePointerMove(event) {
        if (!isHomeDragging || !homePasswordList) {
            return;
        }

        const deltaX = event.clientX - homeDragStartX;
        if (Math.abs(deltaX) > 6) {
            suppressHomeCardClick = true;
        }

        homePasswordList.scrollLeft = homeDragStartScroll - deltaX;
        updateHomeSliderControls();
    }

    function onHomePointerEnd() {
        if (!isHomeDragging || !homePasswordList) {
            return;
        }

        isHomeDragging = false;
        homePasswordList.classList.remove("is-dragging");
        window.setTimeout(() => {
            suppressHomeCardClick = false;
        }, 0);
    }

    function resetEditorState() {
        selectedPasswordId = null;
        isEditPasswordVisible = false;

        if (editForm) {
            editForm.classList.add("d-none");
            editForm.reset();
        }

        if (editPasswordId) {
            editPasswordId.value = "";
        }

        if (editSitePassword) {
            editSitePassword.type = "password";
        }

        if (toggleEditPassword) {
            toggleEditPassword.textContent = "Show Password";
        }

        if (editorPlaceholder) {
            editorPlaceholder.classList.remove("d-none");
        }

        updateSaveChangesState();
    }

    function openEditor(id) {
        const selected = getPasswordById(id);
        if (!selected || !editForm || !editorPlaceholder || !editPasswordId || !editSiteUrl || !editSiteUsername || !editSitePassword) {
            return;
        }

        selectedPasswordId = String(selected.id);
        editPasswordId.value = selectedPasswordId;
        editSiteUrl.value = selected.url;
        editSiteUsername.value = selected.username;
        editSitePassword.value = selected.password;

        isEditPasswordVisible = false;
        editSitePassword.type = "password";
        if (toggleEditPassword) {
            toggleEditPassword.textContent = "Show Password";
        }

        editorPlaceholder.classList.add("d-none");
        editForm.classList.remove("d-none");
        renderPasswords();
        updateSaveChangesState();
    }

    async function deletePassword(id) {
        const index = getPasswordIndexById(id);
        if (index === -1) {
            return;
        }

        const target = passwords[index];
        const shouldDelete = await showPopup({
            title: "Delete Password",
            message: `Delete "${target.username}"?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            showCancel: true,
            danger: true,
        });

        if (!shouldDelete) {
            return;
        }

        passwords.splice(index, 1);
        persistPasswords();

        if (selectedPasswordId === String(id)) {
            resetEditorState();
        }

        renderPasswords();
    }

    function renderHomePasswords() {
        if (!homePasswordList || !homePasswordCount || !homeEmpty) {
            return;
        }

        homePasswordCount.textContent = String(passwords.length);
        homePasswordList.innerHTML = "";

        if (passwords.length === 0) {
            homeEmpty.classList.remove("d-none");
            updateHomeSliderControls();
            return;
        }

        homeEmpty.classList.add("d-none");

        passwords.forEach((entry) => {
            const card = document.createElement("article");
            card.className = "home-password-card";
            card.dataset.id = String(entry.id);

            const head = document.createElement("div");
            head.className = "password-head";

            const logo = createSiteLogoElement(entry.url, entry.username);

            const username = document.createElement("p");
            username.className = "password-name";
            username.textContent = shortText(getSiteName(entry.url), 30);

            const host = document.createElement("p");
            host.className = "password-url";
            host.textContent = getHostname(entry.url);

            const usernameMeta = document.createElement("p");
            usernameMeta.className = "password-value";
            usernameMeta.textContent = `Username: ${entry.username}`;

            head.appendChild(logo);
            head.appendChild(username);
            card.appendChild(head);
            card.appendChild(host);
            card.appendChild(usernameMeta);

            card.addEventListener("click", () => {
                if (suppressHomeCardClick) {
                    return;
                }
                switchView("manager");
                openEditor(entry.id);
            });

            homePasswordList.appendChild(card);
        });

        updateHomeSliderControls();
        window.requestAnimationFrame(updateHomeSliderControls);
    }

    function renderPasswords() {
        renderHomePasswords();

        if (!passwordList || !passwordCount) {
            return;
        }

        passwordCount.textContent = String(passwords.length);
        passwordList.innerHTML = "";

        if (passwords.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = "No passwords yet. Add one from Add Password.";
            passwordList.appendChild(empty);
            setEditorPlaceholder("No passwords yet. Add one from Add Password.");
            resetEditorState();
            return;
        }

        if (!selectedPasswordId) {
            setEditorPlaceholder("Click a password card to view and edit it.");
        }

        passwords.forEach((entry) => {
            const entryId = String(entry.id);
            const card = document.createElement("article");
            card.className = "password-item";
            if (selectedPasswordId === entryId) {
                card.classList.add("is-active");
            }
            card.dataset.id = entryId;
            card.tabIndex = 0;

            const actions = document.createElement("div");
            actions.className = "password-actions";

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "password-delete-btn js-delete-password";
            deleteButton.dataset.id = entryId;
            deleteButton.textContent = "Delete";

            actions.appendChild(deleteButton);

            const head = document.createElement("div");
            head.className = "password-head";

            const logo = createSiteLogoElement(entry.url, entry.username);

            const username = document.createElement("p");
            username.className = "password-name";
            username.textContent = shortText(getSiteName(entry.url));

            const host = document.createElement("p");
            host.className = "password-url";
            host.textContent = getHostname(entry.url);

            const fullUrl = document.createElement("p");
            fullUrl.className = "password-suburl";
            fullUrl.textContent = shortText(entry.url, 56);

            const usernameMeta = document.createElement("p");
            usernameMeta.className = "password-value";
            usernameMeta.textContent = `Username: ${entry.username}`;

            head.appendChild(logo);
            head.appendChild(username);

            card.appendChild(actions);
            card.appendChild(head);
            card.appendChild(host);
            card.appendChild(fullUrl);
            card.appendChild(usernameMeta);
            passwordList.appendChild(card);
        });
    }

    function addPassword(url, username, password) {
        const id = generateId();
        passwords.unshift({
            id,
            url,
            username,
            password,
        });

        persistPasswords();
        renderPasswords();
        switchView("manager");
        openEditor(id);
    }

    async function onAddPassword(event) {
        event.preventDefault();
        if (!addForm) {
            return;
        }

        const formData = new FormData(addForm);
        const url = clean(formData.get("url"));
        const username = clean(formData.get("username") ?? formData.get("Username") ?? formData.get("name"));
        const password = clean(formData.get("password"));

        const validationError = validatePasswordFields(url, username, password);
        if (validationError) {
            await showPopup({
                title: "Cannot Save",
                message: validationError,
                confirmText: "Got it",
                showCancel: false,
            });
            return;
        }

        if (isDuplicateAccount(url, username, password)) {
            await showPopup({
                title: "Duplicate Account",
                message: "This account already exists.",
                confirmText: "Got it",
                showCancel: false,
            });
            return;
        }

        addPassword(url, username, password);
        addForm.reset();
    }

    async function onPasswordListClick(event) {
        const deleteButton = event.target.closest(".js-delete-password");
        if (deleteButton) {
            event.preventDefault();
            event.stopPropagation();
            await deletePassword(deleteButton.dataset.id);
            return;
        }

        const card = event.target.closest(".password-item");
        if (!card) {
            return;
        }

        openEditor(card.dataset.id);
    }

    function onPasswordListKeydown(event) {
        const card = event.target.closest(".password-item");
        if (!card) {
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openEditor(card.dataset.id);
        }
    }

    async function onEditPassword(event) {
        event.preventDefault();
        if (!editPasswordId || !editSiteUrl || !editSiteUsername || !editSitePassword) {
            return;
        }

        if (!hasEditorChanges()) {
            await showPopup({
                title: "No Changes",
                message: "You did not change anything.",
                confirmText: "OK",
                showCancel: false,
            });
            return;
        }

        const id = editPasswordId.value;
        const index = getPasswordIndexById(id);
        if (index === -1) {
            return;
        }

        const url = clean(editSiteUrl.value);
        const username = clean(editSiteUsername.value);
        const password = clean(editSitePassword.value);

        const validationError = validatePasswordFields(url, username, password);
        if (validationError) {
            await showPopup({
                title: "Cannot Save",
                message: validationError,
                confirmText: "Got it",
                showCancel: false,
            });
            return;
        }

        if (isDuplicateAccount(url, username, password, id)) {
            await showPopup({
                title: "Duplicate Account",
                message: "Another account with the same URL, username and password already exists.",
                confirmText: "Got it",
                showCancel: false,
            });
            return;
        }

        passwords[index] = {
            ...passwords[index],
            url,
            username,
            password,
        };

        persistPasswords();
        renderPasswords();
        openEditor(id);
    }

    function onToggleEditPassword() {
        if (!editSitePassword || !toggleEditPassword) {
            return;
        }

        isEditPasswordVisible = !isEditPasswordVisible;
        editSitePassword.type = isEditPasswordVisible ? "text" : "password";
        toggleEditPassword.textContent = isEditPasswordVisible ? "Hide Password" : "Show Password";
    }

    async function onDeleteFromEditor() {
        if (!selectedPasswordId) {
            return;
        }

        await deletePassword(selectedPasswordId);
    }

    function onGeneratePassword() {
        generatedPassword = generateStrongPassword(16);
        updateGeneratorUI();
    }

    async function onDeleteGeneratedPassword() {
        if (!generatedPassword) {
            return;
        }

        const shouldDelete = await showPopup({
            title: "Delete Generated Password",
            message: "Are you sure you want to delete this generated password?",
            confirmText: "Delete",
            cancelText: "Cancel",
            showCancel: true,
            danger: true,
        });

        if (!shouldDelete) {
            return;
        }

        generatedPassword = "";
        updateGeneratorUI();
    }

    async function onSaveGeneratedPassword() {
        if (!generatedPassword) {
            await showPopup({
                title: "No Password",
                message: "Generate a password first.",
                confirmText: "OK",
                showCancel: false,
            });
            return;
        }

        switchView("add");
        if (sitePasswordInput) {
            sitePasswordInput.value = generatedPassword;
            sitePasswordInput.dispatchEvent(new Event("input", { bubbles: true }));
            sitePasswordInput.focus();
        }
    }

    function initEvents() {
        navLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                const nextView = link.dataset.view || "home";
                switchView(nextView);
                closeMobileNavbar();
            });
        });

        if (addForm) {
            addForm.addEventListener("submit", onAddPassword);
        }

        if (passwordList) {
            passwordList.addEventListener("click", onPasswordListClick);
            passwordList.addEventListener("keydown", onPasswordListKeydown);
        }

        if (editForm) {
            editForm.addEventListener("submit", onEditPassword);
        }

        if (toggleEditPassword) {
            toggleEditPassword.addEventListener("click", onToggleEditPassword);
        }

        if (deleteFromEditor) {
            deleteFromEditor.addEventListener("click", onDeleteFromEditor);
        }

        if (editSiteUrl) {
            editSiteUrl.addEventListener("input", updateSaveChangesState);
        }

        if (editSiteUsername) {
            editSiteUsername.addEventListener("input", updateSaveChangesState);
        }

        if (editSitePassword) {
            editSitePassword.addEventListener("input", updateSaveChangesState);
        }

        if (homePrev) {
            homePrev.addEventListener("click", () => scrollHomePasswords(-1));
        }

        if (homeNext) {
            homeNext.addEventListener("click", () => scrollHomePasswords(1));
        }

        if (homePasswordList) {
            homePasswordList.addEventListener("scroll", updateHomeSliderControls);
            homePasswordList.addEventListener("pointerdown", onHomePointerDown);
            homePasswordList.addEventListener("pointermove", onHomePointerMove);
            homePasswordList.addEventListener("pointerup", onHomePointerEnd);
            homePasswordList.addEventListener("pointercancel", onHomePointerEnd);
            homePasswordList.addEventListener("pointerleave", onHomePointerEnd);
        }

        if (generatePasswordButton) {
            generatePasswordButton.addEventListener("click", onGeneratePassword);
        }

        if (saveGeneratedPassword) {
            saveGeneratedPassword.addEventListener("click", onSaveGeneratedPassword);
        }

        if (deleteGeneratedPassword) {
            deleteGeneratedPassword.addEventListener("click", onDeleteGeneratedPassword);
        }

        if (exportCsvButton) {
            exportCsvButton.addEventListener("click", onExportCsv);
        }

        if (importCsvButton) {
            importCsvButton.addEventListener("click", onImportCsvClick);
        }

        if (importCsvInput) {
            importCsvInput.addEventListener("change", onImportCsvChange);
        }

        if (clearDataConfirmInput) {
            clearDataConfirmInput.addEventListener("input", updateClearDataState);
        }

        if (clearDataButton) {
            clearDataButton.addEventListener("click", onClearAllData);
        }

        window.addEventListener("resize", updateHomeSliderControls);
        window.addEventListener("load", updateHomeSliderControls);
    }

    function init() {
        disableInputSuggestions();
        initPopup();
        initSettingsModal();
        initEvents();
        renderPasswords();
        updateGeneratorUI();
        updateClearDataState();
        resetEditorState();
        switchView("home");
    }

    document.addEventListener("DOMContentLoaded", init);
})();
