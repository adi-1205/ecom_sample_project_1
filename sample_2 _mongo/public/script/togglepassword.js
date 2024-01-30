const passwordBtn = document.getElementById('basic-addon2')
const passwordInput = document.getElementById('password')

passwordBtn.addEventListener('click', () => {

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text'
        passwordBtn.innerHTML = '<i class="fa fa-eye" aria-hidden="true"></i>'
        passwordBtn.dataset.open = 'true'
    } else {
        passwordInput.type = 'password'
        passwordBtn.innerHTML = '<i class="fa fa-eye-slash" aria-hidden="true"></i>'
        passwordBtn.dataset.open = 'false'
    }
})

