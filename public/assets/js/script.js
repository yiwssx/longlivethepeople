const socket = io();

function ready(fn) {
    if (document.readyState != 'loading') {
        // Document is already ready, call the callback directly
        fn();
    } else if (document.addEventListener) {
        // All modern browsers to register DOMContentLoaded
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        // Old IE browsers
        document.attachEvent('onreadystatechange', function () {
            if (document.readyState == 'complete') {
                fn();
            }
        });
    }
}

ready(function() {
    document.querySelector('#send').addEventListener('click', () => {
        let codename = document.getElementById("codename").value;
        let affiliation = document.getElementById("affiliation").value;
        let umessage = document.getElementById("message").value;
        sendMessage({
            codename: codename,
            affiliation: affiliation,
            message: umessage
        });
        swal.fire({
            title: 'Success!',
            text: 'ส่งข้อความเรียบร้อย',
            icon: 'success',
            confirmButtonText: 'ปิดหน้าต่าง'
          }).then(function() {
            location.reload();
          });      
    });
});

ready(getMessages());
socket.on('message', addMessages);

function addMessages(message) {
    $("#messages>tbody").prepend(`<tr><td>${message.codename}::${message.affiliation}</td><td>${message.message}</td></tr>`);
}

function getMessages() {
    fetch('/messages')
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            data.forEach(addMessages);
        });
}

function sendMessage(data) {
    fetch('/messages', {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json'
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    })
        .then(function (response) {
            return response.json(); // parses JSON response into native JavaScript objects
        })
}

$(document).ready(function () {
    $('button[type="submit"]').attr('disabled', true);
    $('input[type="text"],textarea').on('keyup', function () {
        var codenmae_value = $('input[id="codename"]').val();
        var affiliation_value = $('input[id="affiliation"]').val();
        var message_value = $("#message").val();

        if (codenmae_value != "" && affiliation_value != "" && message_value != "") {
            $('button[type="submit"]').attr('disabled', false);
        } else {
            $('button[type="submit"]').attr('disabled', true);
        }
    });
});