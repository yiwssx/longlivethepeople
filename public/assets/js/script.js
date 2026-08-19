(() => {
    'use strict';

    const API_PATH = '/api/v1/messages';
    const PAGE_LIMIT = 100;
    const HEALING_REFRESH_MS = 30_000;

    const state = {
        ids: new Set(),
        refreshTimer: null,
    };

    const socket = typeof io === 'function' ? io() : null;

    const elements = {
        form: null,
        message: null,
        codename: null,
        affiliation: null,
        messages: null,
    };

    if (history.replaceState) {
        history.replaceState(null, null, location.href);
    }

    const cacheElements = () => {
        elements.form = document.querySelector('#message-form');
        elements.message = document.querySelector('#message');
        elements.codename = document.querySelector('#codename');
        elements.affiliation = document.querySelector('#affiliation');
        elements.messages = document.querySelector('#messages');
    };

    const isMessagePayload = (message) => Boolean(
        message
        && typeof message.id === 'string'
        && typeof message.codename === 'string'
        && typeof message.affiliation === 'string'
        && typeof message.message === 'string'
    );

    const createMessageCard = (message) => {
        const article = document.createElement('article');
        article.className = 'message-card';
        article.dataset.messageId = message.id;

        const sender = document.createElement('p');
        sender.className = 'message-meta';
        sender.textContent = `${message.codename}::${message.affiliation}`;

        const text = document.createElement('p');
        text.className = 'message-text';
        text.textContent = message.message;

        article.append(sender, text);
        return article;
    };

    const showDialog = ({ title, text, onClose }) => {
        if (typeof HTMLDialogElement === 'undefined') {
            window.alert(`${title}\n${text}`);
            if (typeof onClose === 'function') {
                onClose();
            }
            return;
        }

        let dialog = document.querySelector('#archive-dialog');
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'archive-dialog';

            const heading = document.createElement('h2');
            heading.dataset.role = 'title';

            const message = document.createElement('p');
            message.dataset.role = 'text';

            const close = document.createElement('button');
            close.type = 'button';
            close.textContent = 'ปิดหน้าต่าง';

            dialog.append(heading, message, close);
            document.body.appendChild(dialog);
        }

        dialog.querySelector('[data-role="title"]').textContent = title;
        dialog.querySelector('[data-role="text"]').textContent = text;
        const close = dialog.querySelector('button');

        close.onclick = () => {
            dialog.close();
            if (typeof onClose === 'function') {
                onClose();
            }
        };

        dialog.showModal();
    };

    const triggerWarning = () => showDialog({
        title: 'Warning!',
        text: 'กรุณากรอกข้อมูลให้ครบ',
    });

    const triggerFailure = () => showDialog({
        title: 'Fails!',
        text: 'ส่งข้อความไม่สำเร็จ',
    });

    const triggerRateLimit = () => showDialog({
        title: 'ส่งข้อความถี่เกินไป',
        text: 'กรุณารอสักครู่ก่อนส่งข้อความอีกครั้ง',
    });

    const triggerLoadFailure = () => showDialog({
        title: 'ไม่สามารถโหลดข้อความได้',
        text: 'ระบบฐานข้อมูลอาจไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
    });

    const appendMessages = (messages) => {
        if (!elements.messages || !Array.isArray(messages)) {
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

    const prependMessage = (message) => {
        if (!elements.messages || !isMessagePayload(message) || state.ids.has(message.id)) {
            return;
        }

        elements.messages.prepend(createMessageCard(message));
        state.ids.add(message.id);
    };

    const fetchPage = async (before = null) => {
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
            const error = new Error();
            error.status = response.status;
            throw error;
        }

        return response.json();
    };

    const getMessage = async () => {
        let before = null;

        try {
            do {
                const result = await fetchPage(before);
                appendMessages(result.data);
                before = result.pagination.hasMore
                    ? result.pagination.nextCursor
                    : null;
            } while (before);
        } catch (error) {
            triggerLoadFailure();
        }
    };

    const refreshLatestMessages = async () => {
        if (document.hidden) {
            return;
        }

        try {
            const result = await fetchPage();
            [...result.data].reverse().forEach(prependMessage);
        } catch (error) {
            // Intentionally silent.
        }
    };

    const sendMessage = async (data) => {
        const response = await fetch(API_PATH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = new Error();
            error.status = response.status;
            throw error;
        }

        return response.json();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const payload = {
            codename: elements.codename?.value.trim() || '',
            affiliation: elements.affiliation?.value.trim() || '',
            message: elements.message?.value.trim() || '',
        };

        if (!payload.codename || !payload.affiliation || !payload.message) {
            triggerWarning();
            return;
        }

        try {
            const created = await sendMessage(payload);
            prependMessage(created);
            showDialog({
                title: 'Success!',
                text: 'ส่งข้อความเรียบร้อย',
                onClose: () => elements.form?.reset(),
            });
        } catch (error) {
            if (error.status === 429) {
                triggerRateLimit();
                return;
            }
            triggerFailure();
        }
    };

    const start = () => {
        cacheElements();
        getMessage();

        elements.form?.addEventListener('submit', handleSubmit);

        if (socket) {
            socket.on('message', prependMessage);
            socket.on('connect', refreshLatestMessages);
        }

        state.refreshTimer = window.setInterval(refreshLatestMessages, HEALING_REFRESH_MS);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
