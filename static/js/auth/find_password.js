const backend_base_url = "http://backend:8000"

document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('emailInput');
    const sendButton = document.getElementById('sendButton');
    const errorMessage = document.getElementById('errorMessage');
    
    // 이메일 유효성 검사 함수
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // 이메일 입력 필드 변경 감지
    emailInput.addEventListener('input', function() {
        if (validateEmail(emailInput.value)) {
            sendButton.classList.remove('disabled');
        } else {
            sendButton.classList.add('disabled');
        }
    });
    
    // 인증 코드 보내기 버튼 클릭 시
    sendButton.addEventListener('click', async function() {
        const email = emailInput.value.trim();

        try {
            const response = await fetch(`${backend_base_url}/user/find-password/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'email': email
                })
            });
            const data = await response.json();  // 상태 코드 확인용 로그

            // response.status로 성공 여부 확인
            if (response.status === 200) {
                setEmailWithExpiry(email);
                // 성공 시 이메일을 로컬 스토리지에 저장 후 인증 페이지로 이동
                localStorage.setItem('resetPasswordEmail', emailInput.value);
                window.location.href = 'find_password_verify.html';
            } else {
                // 서버에서 보내는 에러 메시지 표시
                errorMessage.textContent = data.message || '인증 코드 발송에 실패했습니다.';
            }
        } catch (error) {
            // 네트워크 오류 등 처리
            errorMessage.textContent = '네트워크 오류가 발생했습니다. 다시 시도해주세요.';
            console.error('Error:', error);
        }
    });
});

