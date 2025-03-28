const backend_base_url = "https://13.209.15.78:8000/api"

// 전역 타이머 변수 추가
let currentTimer = null;

// 저장된 이메일을 가져오는 함수 추가
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

// 페이지 로드 시 이메일 주크 추가
document.addEventListener('DOMContentLoaded', () => {
    const email = getEmailWithExpiry();
    if (!email) {
        alert('인증 시간이 만료되었거나 유효하지 않은 접근입니다.');
        window.location.href = 'signin.html';
        return;
    }

    const descriptionElement = document.querySelector('.verification-description');
    descriptionElement.innerHTML = `
        ${email}으로 발송된 6자리 인증번호를 입력해주세요.<br>
        인증번호는 10분간 유효합니다.
    `;
});

const inputs = document.querySelectorAll('.code-input');
const timerDisplay = document.getElementById('timer');

// 인증번호 입력 자동 이동 및 검증
inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        // 숫자만 허용
        e.target.value = e.target.value.replace(/[^\d]/g, '');

        // 다음 입력 필드로 자동 이동
        if (e.target.value.length === 1 && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }

        // 6자리 모두 입력 시 검증 함수 호출로 변경
        if (Array.from(inputs).every(input => input.value.length === 1)) {
            const verificationCode = Array.from(inputs).map(input => input.value).join('');
            verifyCode(verificationCode);
        }
    });

    // 백스페이스로 이전 입력 필드로 이동
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
            inputs[index - 1].focus();
        }
    });
});

// 타이머 구현 수정
function startTimer() {
    // 기존 타이머가 있다면 제거
    if (currentTimer) {
        clearInterval(currentTimer);
    }

    let time = 600; // 10분
    timerDisplay.textContent = '10:00';
    
    currentTimer = setInterval(() => {
        time--;
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (time <= 0) {
            clearInterval(currentTimer);
            timerDisplay.textContent = '00:00';
            currentTimer = null;
        }
    }, 1000);
}

// 페이지 로드 시 타이머 시작
startTimer();

// 인증번호 검증 함수 수정
async function verifyCode(code) {
    try {
        const itemStr = localStorage.getItem('emailData');
        const email = JSON.parse(itemStr).email;
        if (!email) {
            alert('이메일 정보를 찾을 수 없습니다.');
            return;
        }
        const response = await fetch(`${backend_base_url}/user/verify-code/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                'email': email,
                'verification_code': code
            })
        });

        const data = await response.json();
        if (response.status === 200) {
            window.location.href = 'signup.html';
        } else {
            // 에러 메시지 표시
            let errorMessage;
            if (data.non_field_errors) {
                errorMessage = data.non_field_errors[0];  // "인증번호가 만료되었습니다"
            } else if (data.message) {
                errorMessage = data.message;  // "잘못된 인증번호입니다"
            } else {
                errorMessage = '인증 과정에서 오류가 발생했습니다.';
            }
            alert(errorMessage);
            
            // 입력 필드 초기화
            inputs.forEach(input => {
                input.value = '';
            }); 
            inputs[0].focus();
        }
    } catch (error) {
        console.error('인증 과정에서 오류가 발생했습니다:', error);
        alert('인증 과정에서 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// 인증번호 재전송 기능
document.querySelector('.resend-link').addEventListener('click', async function(e) {
    e.preventDefault();
    
    const email = getEmailWithExpiry();
    if (!email) {
        alert('이메일 정보를 찾을 수 없습니다.');
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

        if (response.status === 200) {
            alert('인증번호가 재전송되었습니다.');
            // 타이머 리셋 (clearInterval 제거 - startTimer 내부에서 처리)
            startTimer();
        } else {
            const data = await response.json();
            alert(data.message || '인증번호 재전송에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
});