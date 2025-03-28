const backend_base_url = "https://13.209.15.78:8000/api"

document.addEventListener('DOMContentLoaded', function() {
    // 인증 확인
    const isVerified = localStorage.getItem('resetCodeVerified');
    const resetEmail = localStorage.getItem('resetPasswordEmail');
    
    if (!isVerified || !resetEmail) {
        // 인증되지 않았거나 이메일이 없으면 첫 페이지로 이동
        window.location.href = 'reset_password.html';
        return;
    }
    
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const resetButton = document.getElementById('resetButton');
    const errorMessage = document.getElementById('errorMessage');
    const resultModal = document.getElementById('resultModal');
    const successContent = document.getElementById('successContent');
    const errorContent = document.getElementById('errorContent');
    const modalErrorMessage = document.getElementById('modalErrorMessage');
    const goToLoginBtn = document.getElementById('goToLoginBtn');
    const closeErrorBtn = document.getElementById('closeErrorBtn');
    
    // 비밀번호 유효성 검사 함수
    function validatePassword(password) {
        // 영어와 특수문자를 포함한 8자 이상
        const regex = /^(?=.*[A-Za-z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        return regex.test(password);
    }
    
    // 입력 필드 이벤트 처리
    function checkInputs() {
        errorMessage.textContent = '';
        
        if (!newPassword.value || !confirmPassword.value) {
            return;
        }
        
        // 비밀번호 유효성 검사
        if (!validatePassword(newPassword.value)) {
            errorMessage.textContent = '비밀번호는 영어와 특수문자를 포함한 8자 이상이어야 합니다.';
            return;
        }
        
        // 비밀번호 일치 확인
        if (newPassword.value !== confirmPassword.value) {
            errorMessage.textContent = '비밀번호가 일치하지 않습니다.';
            return;
        }
    }
    
    newPassword.addEventListener('input', checkInputs);
    confirmPassword.addEventListener('input', checkInputs);
    
    // 비밀번호 변경 버튼 클릭 시
    resetButton.addEventListener('click', async function() {
        // 유효성 재확인
        if (!validatePassword(newPassword.value)) {
            errorMessage.textContent = '비밀번호는 영어와 특수문자를 포함한 8자 이상이어야 합니다.';
            return;
        }
        
        if (newPassword.value !== confirmPassword.value) {
            errorMessage.textContent = '비밀번호가 일치하지 않습니다.';
            return;
        }

        try {
            const response = await fetch(`${backend_base_url}/user/find-password-reset/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'confirm_password':confirmPassword.value,
                    'new_password': newPassword.value,
                    'email': resetEmail
                })
            });
            const data = await response.json();  // 상태 코드 확인용 로그
            console.log(data);

            // 성공 모달 표시
            resultModal.style.display = 'block';
            successContent.style.display = 'block';
            
            // 로컬 스토리지 정리
            localStorage.removeItem('resetPasswordEmail');
            localStorage.removeItem('resetCodeVerified');
        } catch (error) {
            // 네트워크 오류 등 처리
            errorMessage.textContent = '네트워크 오류가 발생했습니다. 다시 시도해주세요.';
            console.error('Error:', error);
        }
    });
    
    // 모달 버튼 이벤트
    goToLoginBtn.addEventListener('click', function() {
        window.location.href = 'signin.html';
    });
    
    closeErrorBtn.addEventListener('click', function() {
        resultModal.style.display = 'none';
        errorContent.style.display = 'none';
    });
});