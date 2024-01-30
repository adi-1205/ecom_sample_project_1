$(document).ready(function () {
    // forms handle start

    // register page
    $('#register').click(function () {
        let formData = getValById('username', 'email', 'password');
        submitForm('/auth/register', { formData, redirect: '/auth/login' })
    })
    // login page
    $('#login').click(function () {
        let formData = getValById('email', 'password');
        submitForm('/auth/login', { formData, redirect: '/' })
    })
    //get reset email
    $('#getlink').click(function () {
        let formData = getValById('email');
        submitForm('/auth/pwd-reset-email', { formData, displaySuccess: true })
    })
    //reset password
    $('#reset-pwd').click(function () {
        let token = location.href.split('/').at(-1)
        $('#token').val(token)
        let formData = getValById('password', 'cpassword', 'token');
        console.log(formData);
        submitForm('/auth/reset-pwd', { formData, redirect: '/auth/login' })
    })
    // add product
    $('#open-add-product').click(function () {
        let fileHtml = `<div class="mb-3">
        <label class="form-label">Product Thumbnail</label>
        <input class="form-control" type="file" name="thumbnail" id="thumbnail">
        </div>
         <div class="mb-3">
            <label class="form-label">Product Images</label>
            <input class="form-control" type="file" name="images" multiple id="images">
        </div>`
        let htmlContent = $('.modal-body').html()
        $('#modal-title').text('Add Product')
        $('#reset').text('Cancel')
        $('#submit').text('Add')
        $('.modal-body').html(htmlContent + fileHtml)
        $('#modal').modal('show')
        $('#submit').off('click')
        $('#submit').on('click', () => {
            let formData = getValById('title', 'shortDesc', 'desc', 'price', 'stock', 'discount', 'category')
            let thumbnail = $('#thumbnail')[0].files[0];
            let images = $('#images')[0].files;
            console.log(formData);
            let fd = new FormData()

            for (key in formData)
                fd.append(key, formData[key])
            fd.append('thumbnail', thumbnail);

            for (let i = 0; i < images.length; i++) {
                fd.append('images', images[i]);
            }

            $.ajax({
                url: '/product',
                type: 'post',
                data: fd,
                processData: false,
                contentType: false,
                success: (data) => {
                    window.location.href = '/seller-profile'
                },
                error: (err) => {
                    console.log(err)
                    if (err.status == 400 || err.status == 500) {
                        $("#error").css("display", "block").text(`*${err.responseJSON.error}`);
                    }
                }
            });

        })
    })
    // update product
    $('.open-update-product').click(function () {
        let pid = $(this).data('pid')
        let info = $(this).data('info')
        console.log(info);
        $('#modal-title').text('Update Product')
        $('#reset').text('Cancel')
        $('#submit').text('Update')
        $('#title').val(info.title);
        $('#shortDesc').val(info.shortDesc);
        $('#desc').val(info.desc);
        $('#price').val(info.price);
        $('#stock').val(info.stock);
        $('#discount').val(info.discount);
        $('#category').val(info.category);

        $('#modal').modal('show')

        $('#submit').off('click')
        $('#submit').on('click', () => {
            let formData = getValById('title', 'shortDesc', 'desc', 'price', 'stock', 'discount', 'category')
            formData['id'] = pid
            submitForm('/product', { formData, redirect: '/seller-profile', displaySuccess: false, method: 'put' })
        })
    })
    // delete product
    $('.delete-product').click(function () {
        let id = $(this).data('pid')
        submitForm('/product', { formData: { id: id }, redirect: '/seller-profile', displaySuccess: false, method: 'delete' })
    })

    $('#add-to-cart').click(function () {
        let id = $(this).data('pid')
        let qty = $('#qty-btn').text() || 1
        submitForm('/cart', { formData: { id: id, qty }, redirect: false, displaySuccess: true, method: 'post' })
        setTimeout(() => {
            $("#error").css("display", "none")
            $("#success").css("display", "none")
        }, 3000)
    })

    $('.remove-from-cart').click(function () {
        let id = $(this).data('pid')
        submitForm('/cart', { formData: { id: id }, redirect: false, displaySuccess: false, method: 'delete' })
        setTimeout(() => {
            $("#error").css("display", "none")
            $("#success").css("display", "none")
            window.location.reload()
        }, 3000)
    })

    $('#buy-now').click(function () {
        let id = $(this).data('pid')
        submitForm('/cart', { formData: { id: id, qty: 1 }, redirect: '/cart', displaySuccess: false, method: 'post' })
        setTimeout(() => {
            $("#error").css("display", "none")
            $("#success").css("display", "none")
        }, 3000)
    })

    $('#buy').click(function () {

        let cartItems = $('.cart-item')
        let items = []
        for (c of cartItems) {
            items.push({
                id: c.dataset.pid,
                qty: c.dataset.qty
            })
        }
        submitForm('/order', { formData: { items }, redirect: false, displaySuccess: true })
        $('#cart-count').text('Count(0)')
        setTimeout(() => {
            $("#error").css("display", "none")
            $("#success").css("display", "none")
            window.location.reload()
        }, 3000)
    })

    $('#search-product').click(function () {
        let search = $('#search-product-name').val()
        if (search !== '') {
            window.location.href = `/products?name=${search}`
        }
    })
    // forms handle ends

    // ui start 

    $("#inc-qty").click(() => {
        let btn = $('#qty-btn')
        let val = +btn.text()
        if (val < btn.data('stock'))
            $('#qty-btn').text(val + 1)
    })
    $("#dec-qty").click(() => {
        let btn = $('#qty-btn')
        let val = +btn.text()
        if (val > 0)
            $('#qty-btn').text(val - 1)
    })

    // ui end 

    //utitlity start

    function getValById(...ids) {
        let obj = {}
        ids.forEach(id => { obj[id] = $(`#${id}`).val() })
        return obj
    }
    // formData, redirect, displaySuccess, method
    function submitForm(url, { ...options }) {
        $.ajax({
            url: url,
            type: options.method ? options.method : 'post',
            data: JSON.stringify(options.formData),
            contentType: 'application/json',
            success: (data) => {
                if(data.redirect){
                    window.location.replace(data.redirect)
                    return
                }
                if (options.redirect) {
                    window.location.href = options.redirect
                }
                if (options.displaySuccess) {
                    $("#success").css("display", "block").text(`*${data.message}`);
                    $("#error").css("display", "none")
                }
            },
            error: (err) => {
                console.log(err)
                if (err.status == 400 || err.status == 500) {
                    $("#error").css("display", "block").text(`*${err.responseJSON.error}`);
                }
            }
        });
    }

    // utility end
});
