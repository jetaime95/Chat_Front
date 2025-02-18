const backend_base_url = "http://127.0.0.1:8000";

document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    initializePasswordChange();
});

function checkLoginStatus() {
    const accessToken = localStorage.getItem('access');
    if (!accessToken || isTokenExpired(accessToken)) {
        localStorage.removeItem('access');
        window.location.href = 'signin.html';
    }
}

function isTokenExpired(token) {
    if (!token) return true;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() > exp;
}

function validatePassword(password) {
    const hasMinLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasMinLength && hasLetter && hasNumber && hasSpecial;
}

function validateRequiredField(field, errorElement) {
    if (!field.value.trim()) {
        errorElement.textContent = '이 필드는 필수입니다.';
        errorElement.style.display = 'block';
        return false;
    }
    return true;
}

function setupPasswordValidationListeners(newPassword, confirmPassword, newPasswordError, confirmPasswordError) {
    newPassword.addEventListener('input', function() {
        if (!validatePassword(this.value)) {
            newPasswordError.textContent = '비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 포함해야 합니다.';
            newPasswordError.style.display = 'block';
        } else {
            newPasswordError.style.display = 'none';
        }
    });
    
    confirmPassword.addEventListener('input', function() {
        if (this.value !== newPassword.value) {
            confirmPasswordError.textContent = '비밀번호가 일치하지 않습니다.';
            confirmPasswordError.style.display = 'block';
        } else {
            confirmPasswordError.style.display = 'none';
        }
    });
}

async function changePassword(currentPassword, newPassword) {
    const response = await fetch(`${backend_base_url}/user/password-change/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('access'),
        },
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
        })
    });
    
    return { response, data: await response.json() };
}

async function handleFormSubmit(e, form, errorElements) {
    e.preventDefault();
    
    // 요소들을 getElementById로 직접 가져오기
    const currentPassword = document.getElementById('current-password');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');

    const currentPasswordError = document.getElementById('current-password-error');
    const newPasswordError = document.getElementById('new-password-error');
    const confirmPasswordError = document.getElementById('confirm-password-error');
    
    // 에러 메시지 초기화
    [currentPasswordError, newPasswordError, confirmPasswordError].forEach(error => error.style.display = 'none');
    
    // 유효성 검사
    let isValid = true;
    isValid = validateRequiredField(currentPassword, currentPasswordError) && isValid;
    isValid = validateRequiredField(newPassword, newPasswordError) && isValid;
    isValid = validateRequiredField(confirmPassword, confirmPasswordError) && isValid;
    
    if (!validatePassword(newPassword.value)) {
        newPasswordError.textContent = '비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 포함해야 합니다.';
        newPasswordError.style.display = 'block';
        isValid = false;
    }
    
    if (newPassword.value !== confirmPassword.value) {
        confirmPasswordError.textContent = '비밀번호가 일치하지 않습니다.';
        confirmPasswordError.style.display = 'block';
        isValid = false;
    }
    
    if (currentPassword.value === newPassword.value) {
        newPasswordError.textContent = '새 비밀번호는 현재 비밀번호와 달라야 합니다.';
        newPasswordError.style.display = 'block';
        isValid = false;
    }
    
    if (isValid) {
        try {
            const { response, data } = await changePassword(currentPassword.value, newPassword.value);
            console.log(response)
            
            if (!response.ok) {
                if (data.field === 'current_password') {
                    currentPasswordError.textContent = data.message || '현재 비밀번호가 일치하지 않습니다.';
                    currentPasswordError.style.display = 'block';
                } else if (data.field === 'new_password') {
                    newPasswordError.textContent = data.message || '새 비밀번호가 유효하지 않습니다.';
                    newPasswordError.style.display = 'block';
                } else {
                    alert(data.message || '비밀번호 변경 중 오류가 발생했습니다.');
                }
            } else {
                alert('비밀번호가 성공적으로 변경되었습니다.');
                window.location.href = 'profile.html';
            }
        } catch (error) {
            console.error('Error:', error);
            alert('서버와의 통신 중 오류가 발생했습니다.');
        }
    }
}

function initializePasswordChange() {
    const form = document.getElementById('password-form');
    const currentPassword = document.getElementById('current-password');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    
    const errorElements = {
        currentPasswordError: document.getElementById('current-password-error'),
        newPasswordError: document.getElementById('new-password-error'),
        confirmPasswordError: document.getElementById('confirm-password-error')
    };
    
    setupPasswordValidationListeners(newPassword, confirmPassword, 
        errorElements.newPasswordError, errorElements.confirmPasswordError);
    
    form.addEventListener('submit', (e) => handleFormSubmit(e, form, errorElements));
}
