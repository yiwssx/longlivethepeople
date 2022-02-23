const API_PATH = '/api/v1/messages';

const HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

if (history.replaceState) {
    history.replaceState(null, null, location.href);
}

$(function() {
    
    getMessage();

    $('form').submit(function(e) {
        e.preventDefault();
    })

    try {
        $('#send').click(function() {
            let codename = $('#codename').val();
            let affiliation = $('#affiliation').val();
            let message = $('#message').val();

            if(codename.length === 0 && affiliation.length === 0 && message.length === 0) {
                swal.fire({
                    title: 'Warning!',
                    text: 'กรุณากรอกข้อมูลให้ครบ',
                    icon: 'warning',
                    confirmButtonText: 'ปิดหน้าต่าง'
                });
            } else if(codename.length === 0 || affiliation.length === 0 || message.length === 0) {
                swal.fire({
                    title: 'Warning!',
                    text: 'กรุณากรอกข้อมูลให้ครบ',
                    icon: 'warning',
                    confirmButtonText: 'ปิดหน้าต่าง'
                });
            } else {
                sendMessage({
                    codename: codename,
                    affiliation: affiliation,
                    message: message
                })
                swal.fire({
                    title: 'Success!',
                    text: 'ส่งข้อความเรียบร้อย',
                    icon: 'success',
                    confirmButtonText: 'ปิดหน้าต่าง'
                }).then(() => location.reload())
            }

        });

    } catch(error) {
        swal.fire({
            title: 'Fails!',
            text: 'ส่งข้อความไม่สำเร็จ',
            icon: 'error',
            confirmButtonText: 'ปิดหน้าต่าง'
        });
    }

});

const addMessages = (message) => {
    $("#messages>tbody").prepend(`<tr><td>${message.codename}::${message.affiliation}</td><td>${message.message}</td></tr>`);
};

const getMessage = () => {
    fetch(API_PATH, {
        method: 'GET',
        headers: HEADERS, 
    })
    .then((response) => response.json())
    .then((data) => data.forEach(addMessages))
};

const sendMessage = (data) => {
    fetch(API_PATH, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(data)
    })
    .then((response) => response);
};