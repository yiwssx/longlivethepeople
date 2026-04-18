const API_PATH = '/api/v1/messages';

const HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

const socket = typeof io === 'function' ? io() : null;

if (history.replaceState) {
    history.replaceState(null, null, location.href);
}

const showDialog = (options) => {
    const dialog = window.Swal || window.swal;
    if (dialog && typeof dialog.fire === 'function') {
        return dialog.fire(options);
    }

    return Promise.resolve({ isConfirmed: true });
};

const createMessageRow = (message) => {
    const row = document.createElement('tr');
    const senderCell = document.createElement('td');
    const messageCell = document.createElement('td');

    senderCell.textContent = `${message.codename}::${message.affiliation}`;
    messageCell.textContent = message.message;
    row.append(senderCell, messageCell);

    return row;
};

$(() => {
    
    getMessage();
    if (socket) {
        socket.on('message', addMessages);
    }

    $('form').attr('autocomplete', 'off');

    $('input').focus(function () {
        $('form').attr('autocomplete', 'off');
        $('textarea').prop('required', true);
        if(!$(this).prop('required')) {
            $(this).prop('required', true);
        }
    });

    try {
        $('form').submit((e) => {
            e.preventDefault();

            const codename = $('#codename').val().trim();
            const affiliation = $('#affiliation').val().trim();
            const message = $('#message').val().trim();

            if(codename.length === 0 || affiliation.length === 0 || message.length === 0) {
                triggerWarning();
            } else {
                sendMessage({
                    codename: codename,
                    affiliation: affiliation,
                    message: message
                }).then(() => {
                    showDialog({
                        title: 'Success!',
                        text: 'ส่งข้อความเรียบร้อย',
                        icon: 'success',
                        confirmButtonText: 'ปิดหน้าต่าง',
                        allowOutsideClick: false
                    }).then((result) => {
                        if(result.isConfirmed) {
                            $('form')[0].reset();
                        }
                    });
                }).catch(() => {
                    triggerFailure();
                });
            }

        });
    } catch(error) {
        showDialog({
            title: 'Fails!',
            text: 'ส่งข้อความไม่สำเร็จ',
            icon: 'error',
            confirmButtonText: 'ปิดหน้าต่าง',
            allowOutsideClick: false
        });
    }
});

const triggerWarning = () => {
    showDialog({
        title: 'Warning!',
        text: 'กรุณากรอกข้อมูลให้ครบ',
        icon: 'warning',
        confirmButtonText: 'ปิดหน้าต่าง',
        allowOutsideClick: false
    }).then(() => {
        $('form').attr('autocomplete', 'off');
        $('textarea').prop('required', true);
        $('input').prop('required', true);
    });
};

const triggerFailure = () => {
    showDialog({
        title: 'Fails!',
        text: 'ส่งข้อความไม่สำเร็จ',
        icon: 'error',
        confirmButtonText: 'ปิดหน้าต่าง',
        allowOutsideClick: false
    });
};

const addMessages = (message) => {
    $('#messages>tbody').prepend(createMessageRow(message));
};

const renderHistory = (messages) => {
    if(!Array.isArray(messages)) {
        return;
    }

    const rows = document.createDocumentFragment();
    messages.forEach((message) => {
        rows.appendChild(createMessageRow(message));
    });

    $('#messages>tbody').append(rows);
};

const getMessage = () => {
    fetch(API_PATH, {
        method: 'GET',
        headers: HEADERS, 
    })
    .then((response) => {
        if(response.status === 204) {
            return [];
        }

        if(!response.ok) {
            throw new Error('Unable to fetch messages');
        }

        return response.json();
    })
    .then((data) => renderHistory(data))
    .catch(() => {
        renderHistory([]);
    });
};

const sendMessage = async (data) => {
    const response = await fetch(API_PATH, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(data)
    });

    if(!response.ok) {
        throw new Error('Unable to send message');
    }

    return response.json();
};
