$(document).ready(function () {
    // forms handle start

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
            submitForm('/admin/product', { formData, displaySuccess: false, method: 'put', redirect: window.location.href })
        })
    })
    // delete product
    $('.delete-product').click(function () {
        let id = $(this).data('pid')
        submitForm('/admin/product', { formData: { id: id }, displaySuccess: false, method: 'delete', redirect: window.location.href })
    })

    $('#search-product').click(function () {
        let val = $('#val').val() 
        let filter = $('#filter').val() 
        if (val !== '') {
            window.location.href = `/admin/products?filter=${filter}&val=${val}`
        }
    })
    $('#search-order').click(function () {
        let val = $('#val').val() 
        let filter = $('#filter').val() 
        if (val !== '') {
            window.location.href = `/admin/orders?filter=${filter}&val=${val}`
        } else{
            window.location.href = `/admin/orders`
        }
    })
    // forms handle ends

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
                if (data.redirect) {
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
