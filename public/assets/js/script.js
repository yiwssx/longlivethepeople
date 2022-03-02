const API_PATH = '/api/v1/messages';

const HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

const socket = io();

if (history.replaceState) {
    history.replaceState(null, null, location.href);
}

$(() => {
    
    getMessage();
    socket.on('message', addMessages);

    $('form').attr('autocomplete', () => {
        if($(this).attr('autocomplete')) {
            if($(this).attr('autocomplete').val() !== 'off') {
                $(this).attr('autocomplete', 'off');
            }
        } else {
            $(this).attr('autocomplete', 'off');
        }
    });

    $('input').focus(() => {
        $('form').attr('autocomplete', 'off');
        $('textarea').prop('required', true);
        if($(this).attr('required') !== true) {
            $(this).prop('required', true);
        }
    });

    try {
        $('form').submit((e) => {
            e.preventDefault();

            let codename = $('#codename').val();
            let affiliation = $('#affiliation').val();
            let message = $('#message').val();

            if(codename.length === 0 && affiliation.length === 0 && message.length === 0) {
                triggerWarning();
            } else if(codename.length === 0 || affiliation.length === 0 || message.length === 0) {
                triggerWarning();
            } else {
                sendMessage({
                    codename: codename,
                    affiliation: affiliation,
                    message: message
                }).then(() => {
                    swal.fire({
                        title: 'Success!',
                        text: 'ส่งข้อความเรียบร้อย',
                        icon: 'success',
                        confirmButtonText: 'ปิดหน้าต่าง',
                        allowOutsideClick: false
                    }).then((result) => {
                        if(result.isConfirmed) {
                            $('form')[0].reset();
                        }
                    })
                })
            }

        });
    } catch(error) {
        swal.fire({
            title: 'Fails!',
            text: 'ส่งข้อความไม่สำเร็จ',
            icon: 'error',
            confirmButtonText: 'ปิดหน้าต่าง',
            allowOutsideClick: false
        });
    }
});

const triggerWarning = () => {
    swal.fire({
        title: 'Warning!',
        text: 'กรุณากรอกข้อมูลให้ครบ',
        icon: 'warning',
        confirmButtonText: 'ปิดหน้าต่าง',
        allowOutsideClick: false
    }).then(() => {
        $('form').attr('autocomplete', 'off');
        $('textarea').prop('required', true);
        $('input').prop('required', true);
    })
};

const addMessages = (message) => {
    $('#messages>tbody').prepend(`<tr><td>${message.codename}::${message.affiliation}</td><td>${message.message}</td></tr>`);
};

const getMessage = () => {
    fetch(API_PATH, {
        method: 'GET',
        headers: HEADERS, 
    })
    .then((response) => response.json())
    .then((data) => data.forEach(addMessages))
};

const sendMessage = async (data) => {
    fetch(API_PATH, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(data)
    })
    // .then(addMessages(data));
};