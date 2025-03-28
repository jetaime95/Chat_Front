const backend_base_url = "https://13.209.15.78:8000"

document.addEventListener('DOMContentLoaded', function () {
    const emailInput = document.getElementById('emailInput');
    const sendButton = document.getElementById('sendButton');
    const errorMessage = document.getElementById('errorMessage');

    // 이메일 유효성 검사 함수
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // 이메일 입력 시 버튼 활성화/비활성화 처리
    emailInput.addEventListener('input', function () {
        const email = emailInput.value.trim();

        if (isValidEmail(email)) {
            sendButton.classList.add('active');
            sendButton.disabled = false;
        } else {
            sendButton.classList.remove('active');
            sendButton.disabled = true;
        }

        // 에러 메시지 초기화
        errorMessage.textContent = '';
    });

    // 인증 코드 보내기 버튼 클릭 이벤트
    sendButton.addEventListener('click', async function () {
        const email = emailInput.value.trim();

        // 이메일 유효성 최종 검사
        if (!isValidEmail(email)) {
            errorMessage.textContent = '유효한 이메일 주소를 입력해주세요.';
            return;
        }

        try {
            const response = await fetch(`${backend_base_url}/user/email-verification/`, {
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
                window.location.href = 'email_verified_check.html';
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

    // 이메일과 만료시간을 함께 저장하는 함수
    function setEmailWithExpiry(email) {
        const expiryTime = new Date().getTime() + (30 * 60 * 1000); // 현재시간 + 30분
        const item = {
            email: email,
            expiry: expiryTime,
        }
        localStorage.setItem('emailData', JSON.stringify(item));
    }

    // 저장된 이메일을 가져오는 함수 (만료 체크 포함)
    function getEmailWithExpiry() {
        const itemStr = localStorage.getItem('emailData');
        if (!itemStr) {
            return null;
        }

        const item = JSON.parse(itemStr);
        const now = new Date().getTime();

        if (now > item.expiry) {
            // 만료된 경우 삭제
            localStorage.removeItem('emailData');
            return null;
        }
        return item.email;
    }
});