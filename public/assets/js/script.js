(() => {
    'use strict';

    const API_PATH = '/api/v1/messages';
    const PAGE_LIMIT = 20;
    const TOAST_DURATION_MS = 3200;
    const HEALING_REFRESH_MS = 30_000;

    const state = {
        nextCursor: null,
        hasMore: true,
        loading: false,
        ids: new Set(),
        toastTimer: null,
        refreshTimer: null,
    };

    const elements = {};
    const socket = typeof io === 'function' ? io() : null;
    const dateFormatter = new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const cacheElements = () => {
        elements.form = document.querySelector('#message-form');
        elements.message = document.querySelector('#message');
        elements.codename = document.querySelector('#codename');
        elements.affiliation = document.querySelector('#affiliation');
        elements.messageCount = document.querySelector('#message-count');
        elements.send = document.querySelector('#send');
        elements.formStatus = document.querySelector('#form-status');
        elements.messages = document.querySelector('#messages');
        elements.loadingState = document.querySelector('#loading-state');
        elements.emptyState = document.querySelector('#empty-state');
        elements.errorState = document.querySelector('#error-state');
        elements.errorMessage = document.querySelector('#error-message');
        elements.retryLoad = document.querySelector('#retry-load');
        elements.loadMore = document.querySelector('#load-more');
        elements.liveStatus = document.querySelector('#live-status');
        elements.liveLabel = document.querySelector('.live-label');
        elements.toast = document.querySelector('#toast');
    };

    const isMessagePayload = (message) => Boolean(
        message
        && typeof message.id === 'string'
        && typeof message.codename === 'string'
        && typeof message.affiliation === 'string'
        && typeof message.message === 'string'
        && typeof message.createdAt === 'string'
    );

    const createMessageCard = (message, { isNew = false } = {}) => {
        const article = document.createElement('article');
        article.className = `message-card${isNew ? ' is-new' : ''}`;
        article.dataset.messageId = message.id;

        const text = document.createElement('p');
        text.className = 'message-text';
        text.textContent = message.message;

        const meta = document.createElement('p');
        meta.className = 'message-meta';

        const author = document.createElement('span');
        author.className = 'message-author';
        author.textContent = message.codename;

        const separator = document.createElement('span');
        separator.className = 'message-separator';
        separator.setAttribute('aria-hidden', 'true');
        separator.textContent = '•';

        const affiliation = document.createElement('span');
        affiliation.className = 'message-affiliation';
        affiliation.textContent = message.affiliation;

        const timeSeparator = separator.cloneNode(true);
        const time = document.createElement('time');
        time.className = 'message-time';
        time.dateTime = message.createdAt;
        const parsedDate = new Date(message.createdAt);
        time.textContent = Number.isNaN(parsedDate.getTime())
            ? ''
            : dateFormatter.format(parsedDate);

        meta.append(author, separator, affiliation);
        if (time.textContent) {
            meta.append(timeSeparator, time);
        }
        article.append(text, meta);

        return article;
    };

    const setLiveStatus = (status) => {
        if (!elements.liveStatus || !elements.liveLabel) {
            return;
        }

        const labels = {
            connecting: 'กำลังเชื่อมต่อ',
            live: 'LIVE',
            offline: 'ออฟไลน์',
        };

        elements.liveStatus.dataset.state = status;
        elements.liveLabel.textContent = labels[status] || labels.connecting;
    };

    const setFormStatus = (message = '', tone = '') => {
        if (!elements.formStatus) {
            return;
        }

        elements.formStatus.textContent = message;
        if (tone) {
            elements.formStatus.dataset.tone = tone;
        } else {
            delete elements.formStatus.dataset.tone;
        }
    };

    const showToast = (message, tone = 'success') => {
        if (!elements.toast) {
            return;
        }

        window.clearTimeout(state.toastTimer);
        elements.toast.textContent = message;
        elements.toast.dataset.tone = tone;
        elements.toast.classList.add('is-visible');

        state.toastTimer = window.setTimeout(() => {
            elements.toast.classList.remove('is-visible');
        }, TOAST_DURATION_MS);
    };

    const updateCharacterCount = () => {
        if (!elements.message || !elements.messageCount) {
            return;
        }

        const count = elements.message.value.length;
        elements.messageCount.textContent = `${count.toLocaleString('th-TH')} / 2,000`;
    };

    const updateEmptyState = () => {
        if (!elements.emptyState || !elements.messages) {
            return;
        }

        const hasMessages = elements.messages.childElementCount > 0;
        const hasError = elements.errorState && !elements.errorState.hidden;
        elements.emptyState.hidden = hasMessages || hasError || state.loading;
    };

    const setInitialLoading = (isLoading) => {
        if (elements.loadingState) {
            elements.loadingState.hidden = !isLoading;
        }
        elements.messages?.setAttribute('aria-busy', String(isLoading));
    };

    const setLoadMoreState = () => {
        if (!elements.loadMore) {
            return;
        }

        elements.loadMore.hidden = !state.hasMore || state.loading && state.ids.size === 0;
        elements.loadMore.disabled = state.loading;
        elements.loadMore.textContent = state.loading && state.ids.size > 0
            ? 'กำลังโหลด...'
            : 'อ่านข้อความก่อนหน้า';
    };

    const showLoadError = (error) => {
        if (!elements.errorState || !elements.errorMessage) {
            return;
        }

        const message = error?.status === 503
            ? 'ระบบฐานข้อมูลยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง'
            : 'เกิดข้อผิดพลาดระหว่างโหลดข้อมูล กรุณาลองใหม่';

        elements.errorMessage.textContent = message;
        elements.errorState.hidden = false;
        updateEmptyState();
    };

    const hideLoadError = () => {
        if (elements.errorState) {
            elements.errorState.hidden = true;
        }
    };

    const resetMessageFeed = () => {
        elements.messages?.replaceChildren();
        state.ids.clear();
        state.nextCursor = null;
        state.hasMore = true;
    };

    const fetchMessages = async (before = null) => {
        const url = new URL(API_PATH, window.location.origin);
        url.searchParams.set('limit', String(PAGE_LIMIT));
        if (before) {
            url.searchParams.set('before', before);
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
            const error = new Error('Unable to fetch messages');
            error.status = response.status;
            throw error;
        }

        const body = await response.json();
        if (!body || !Array.isArray(body.data) || !body.pagination) {
            throw new Error('Unexpected message response');
        }

        return body;
    };

    const appendHistory = (messages) => {
        if (!elements.messages) {
            return;
        }

        const fragment = document.createDocumentFragment();
        messages.forEach((message) => {
            if (!isMessagePayload(message) || state.ids.has(message.id)) {
                return;
            }

            fragment.appendChild(createMessageCard(message));
            state.ids.add(message.id);
        });
        elements.messages.appendChild(fragment);
    };

    const prependFreshMessages = (messages) => {
        if (!elements.messages) {
            return;
        }

        [...messages].reverse().forEach((message) => {
            if (!isMessagePayload(message) || state.ids.has(message.id)) {
                return;
            }

            elements.messages.prepend(createMessageCard(message, { isNew: true }));
            state.ids.add(message.id);
        });
        updateEmptyState();
    };

    const loadOlderMessages = async ({ initial = false } = {}) => {
        if (state.loading || !state.hasMore) {
            return;
        }

        state.loading = true;
        if (initial) {
            setInitialLoading(true);
            hideLoadError();
        }
        setLoadMoreState();

        try {
            const result = await fetchMessages(state.nextCursor);
            appendHistory(result.data);
            state.nextCursor = result.pagination.nextCursor || null;
            state.hasMore = Boolean(result.pagination.hasMore);
            hideLoadError();
        } catch (error) {
            if (state.ids.size === 0) {
                showLoadError(error);
            } else {
                showToast('โหลดข้อความก่อนหน้าไม่สำเร็จ กรุณาลองใหม่', 'error');
            }
        } finally {
            state.loading = false;
            setInitialLoading(false);
            setLoadMoreState();
            updateEmptyState();
        }
    };

    const refreshLatestMessages = async () => {
        if (document.hidden) {
            return;
        }

        try {
            const result = await fetchMessages();
            prependFreshMessages(result.data);
        } catch (error) {
            // Healing refresh is intentionally quiet. Interactive loads still
            // surface errors; this poll only repairs missed realtime events.
        }
    };

    const prependLiveMessage = (message) => {
        if (!isMessagePayload(message) || state.ids.has(message.id)) {
            return;
        }
        prependFreshMessages([message]);
    };

    const setSubmitBusy = (busy) => {
        if (!elements.send || !elements.form) {
            return;
        }

        elements.send.disabled = busy;
        elements.send.setAttribute('aria-busy', String(busy));
        elements.form.setAttribute('aria-busy', String(busy));

        const label = elements.send.querySelector('.button-label');
        if (label) {
            label.textContent = busy ? 'กำลังส่ง...' : 'ส่งข้อความไว้อาลัย';
        }
    };

    const resetFieldValidity = () => {
        [elements.message, elements.codename, elements.affiliation].forEach((field) => {
            field?.setCustomValidity('');
            field?.removeAttribute('aria-invalid');
        });
    };

    const getValidatedPayload = () => {
        resetFieldValidity();

        const payload = {
            codename: elements.codename?.value.trim() || '',
            affiliation: elements.affiliation?.value.trim() || '',
            message: elements.message?.value.trim() || '',
        };

        [
            [elements.message, payload.message],
            [elements.codename, payload.codename],
            [elements.affiliation, payload.affiliation],
        ].forEach(([field, value]) => {
            if (field && value.length === 0) {
                field.setCustomValidity('กรุณากรอกข้อมูลในช่องนี้');
                field.setAttribute('aria-invalid', 'true');
            }
        });

        if (!elements.form?.checkValidity()) {
            elements.form?.reportValidity();
            setFormStatus('กรุณากรอกข้อมูลให้ครบก่อนส่งข้อความ', 'error');
            return null;
        }

        return payload;
    };

    const postMessage = async (payload) => {
        const response = await fetch(API_PATH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = new Error('Unable to send message');
            error.status = response.status;
            error.retryAfter = response.headers.get('Retry-After');
            throw error;
        }

        return response.json();
    };

    const describeSubmitError = (error) => {
        if (error?.status === 429) {
            const seconds = Number.parseInt(error.retryAfter, 10);
            return Number.isFinite(seconds) && seconds > 0
                ? `ส่งข้อความถี่เกินไป กรุณาลองใหม่ในประมาณ ${seconds} วินาที`
                : 'ส่งข้อความถี่เกินไป กรุณารอสักครู่แล้วลองใหม่';
        }
        if (error?.status === 503) {
            return 'ระบบฐานข้อมูลยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง';
        }
        if (error?.status === 400 || error?.status === 415) {
            return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อความแล้วลองใหม่';
        }
        return 'ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const payload = getValidatedPayload();
        if (!payload) {
            return;
        }

        setSubmitBusy(true);
        setFormStatus('กำลังส่งข้อความ...');

        try {
            const created = await postMessage(payload);
            prependLiveMessage(created);
            elements.form.reset();
            updateCharacterCount();
            resetFieldValidity();
            setFormStatus('ส่งข้อความเรียบร้อยแล้ว', 'success');
            showToast('ส่งข้อความแล้ว ขอบคุณที่ร่วมบันทึกความทรงจำ', 'success');
        } catch (error) {
            const message = describeSubmitError(error);
            setFormStatus(message, 'error');
            showToast(message, 'error');
        } finally {
            setSubmitBusy(false);
        }
    };

    const bindForm = () => {
        if (!elements.form) {
            return;
        }

        elements.form.addEventListener('submit', handleSubmit);
        elements.message?.addEventListener('input', () => {
            elements.message.setCustomValidity('');
            elements.message.removeAttribute('aria-invalid');
            updateCharacterCount();
        });

        [elements.codename, elements.affiliation].forEach((field) => {
            field?.addEventListener('input', () => {
                field.setCustomValidity('');
                field.removeAttribute('aria-invalid');
            });
        });
    };

    const bindFeedActions = () => {
        elements.retryLoad?.addEventListener('click', () => {
            resetMessageFeed();
            loadOlderMessages({ initial: true });
        });

        elements.loadMore?.addEventListener('click', () => {
            loadOlderMessages();
        });
    };

    const bindSocket = () => {
        if (!socket) {
            setLiveStatus('offline');
            return;
        }

        setLiveStatus(socket.connected ? 'live' : 'connecting');
        socket.on('connect', () => {
            setLiveStatus('live');
            refreshLatestMessages();
        });
        socket.on('disconnect', () => setLiveStatus('offline'));
        socket.on('connect_error', () => setLiveStatus('offline'));
        socket.on('message', prependLiveMessage);
    };

    const startHealingRefresh = () => {
        state.refreshTimer = window.setInterval(refreshLatestMessages, HEALING_REFRESH_MS);
        window.addEventListener('pagehide', () => {
            window.clearInterval(state.refreshTimer);
        }, { once: true });
    };

    const init = () => {
        cacheElements();
        resetMessageFeed();
        bindForm();
        bindFeedActions();
        bindSocket();
        startHealingRefresh();
        updateCharacterCount();
        loadOlderMessages({ initial: true });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
