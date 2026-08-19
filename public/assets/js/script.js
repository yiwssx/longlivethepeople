(() => {
    'use strict';

    const API_PATH = '/api/v1/messages';
    const PAGE_LIMIT = 20;
    const TOAST_DURATION_MS = 3200;

    const state = {
        page: 0,
        hasMore: true,
        loading: false,
        signatures: new Set(),
        toastTimer: null,
    };

    const elements = {};
    const socket = typeof io === 'function' ? io() : null;

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

    const messageSignature = (message) => [
        message?.codename ?? '',
        message?.affiliation ?? '',
        message?.message ?? '',
    ].join('\u001f');

    const isMessagePayload = (message) => Boolean(
        message
        && typeof message.codename === 'string'
        && typeof message.affiliation === 'string'
        && typeof message.message === 'string'
    );

    const createMessageCard = (message, { isNew = false } = {}) => {
        const article = document.createElement('article');
        article.className = `message-card${isNew ? ' is-new' : ''}`;

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

        meta.append(author, separator, affiliation);
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
        const isInitialLoading = state.loading && state.page === 0;
        elements.emptyState.hidden = hasMessages || hasError || isInitialLoading;
    };

    const setInitialLoading = (isLoading) => {
        if (elements.loadingState) {
            elements.loadingState.hidden = !isLoading;
        }
        if (elements.messages) {
            elements.messages.setAttribute('aria-busy', String(isLoading));
        }
    };

    const setLoadMoreState = () => {
        if (!elements.loadMore) {
            return;
        }

        elements.loadMore.hidden = !state.hasMore || state.page === 0;
        elements.loadMore.disabled = state.loading;
        elements.loadMore.textContent = state.loading && state.page > 0
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

    const fetchMessages = async (page) => {
        const url = new URL(API_PATH, window.location.origin);
        url.searchParams.set('page', String(page));
        url.searchParams.set('limit', String(PAGE_LIMIT));

        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });

        if (response.status === 204) {
            return [];
        }

        if (!response.ok) {
            const error = new Error('Unable to fetch messages');
            error.status = response.status;
            throw error;
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Unexpected message response');
        }

        return data;
    };

    const appendHistory = (messages, { reset = false } = {}) => {
        if (!elements.messages) {
            return;
        }

        if (reset) {
            elements.messages.replaceChildren();
            state.signatures.clear();
        }

        const signaturesBeforePage = new Set(state.signatures);
        const fragment = document.createDocumentFragment();

        messages.forEach((message) => {
            if (!isMessagePayload(message)) {
                return;
            }

            const signature = messageSignature(message);
            if (!reset && signaturesBeforePage.has(signature)) {
                return;
            }

            fragment.appendChild(createMessageCard(message));
            state.signatures.add(signature);
        });

        elements.messages.appendChild(fragment);
    };

    const loadPage = async (page, { reset = false, quiet = false } = {}) => {
        if (state.loading) {
            return;
        }

        state.loading = true;
        const initialLoad = state.page === 0 && !quiet;

        if (initialLoad) {
            setInitialLoading(true);
        }
        if (reset || initialLoad) {
            hideLoadError();
        }
        setLoadMoreState();

        try {
            const messages = await fetchMessages(page);
            appendHistory(messages, { reset });
            state.page = page;
            state.hasMore = messages.length === PAGE_LIMIT;
            hideLoadError();
        } catch (error) {
            if (state.page === 0 || reset) {
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

    const prependLiveMessage = (message) => {
        if (!elements.messages || !isMessagePayload(message)) {
            return;
        }

        const card = createMessageCard(message, { isNew: true });
        elements.messages.prepend(card);
        state.signatures.add(messageSignature(message));
        updateEmptyState();
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
            if (!field) {
                return;
            }
            field.setCustomValidity('');
            field.removeAttribute('aria-invalid');
        });
    };

    const getValidatedPayload = () => {
        resetFieldValidity();

        const payload = {
            codename: elements.codename?.value.trim() || '',
            affiliation: elements.affiliation?.value.trim() || '',
            message: elements.message?.value.trim() || '',
        };

        const fields = [
            [elements.message, payload.message],
            [elements.codename, payload.codename],
            [elements.affiliation, payload.affiliation],
        ];

        fields.forEach(([field, value]) => {
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
            if (Number.isFinite(seconds) && seconds > 0) {
                return `ส่งข้อความถี่เกินไป กรุณาลองใหม่ในประมาณ ${seconds} วินาที`;
            }
            return 'ส่งข้อความถี่เกินไป กรุณารอสักครู่แล้วลองใหม่';
        }

        if (error?.status === 503) {
            return 'ระบบฐานข้อมูลยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง';
        }

        if (error?.status === 400) {
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
            await postMessage(payload);
            elements.form.reset();
            updateCharacterCount();
            resetFieldValidity();
            setFormStatus('ส่งข้อความเรียบร้อยแล้ว', 'success');
            showToast('ส่งข้อความแล้ว ขอบคุณที่ร่วมบันทึกความทรงจำ', 'success');

            if (!socket || !socket.connected) {
                await loadPage(1, { reset: true, quiet: true });
            }
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
            state.page = 0;
            state.hasMore = true;
            loadPage(1, { reset: true });
        });

        elements.loadMore?.addEventListener('click', () => {
            if (state.hasMore) {
                loadPage(state.page + 1);
            }
        });
    };

    const bindSocket = () => {
        if (!socket) {
            setLiveStatus('offline');
            return;
        }

        setLiveStatus(socket.connected ? 'live' : 'connecting');
        socket.on('connect', () => setLiveStatus('live'));
        socket.on('disconnect', () => setLiveStatus('offline'));
        socket.on('connect_error', () => setLiveStatus('offline'));
        socket.on('message', prependLiveMessage);
    };

    const init = () => {
        cacheElements();
        bindForm();
        bindFeedActions();
        bindSocket();
        updateCharacterCount();
        loadPage(1, { reset: true });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
