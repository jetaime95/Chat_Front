const backend_base_url = "https://13.209.15.78:8000/api"

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

// 생년월일 드롭다운 동적 생성 스크립트
window.onload = function() {
    const email = getEmailWithExpiry();  // 만료 체크 포함하여 이메일 가져오기
    if (!email) {
        alert('인증 시간이 만료되었거나 유효하지 않은 접근입니다.');
        window.location.href = 'signin.html';
        return;
    }
    document.getElementById('email').value = email;

    const yearSelect = document.getElementById('birthYear');
    const monthSelect = document.getElementById('birthMonth');
    const daySelect = document.getElementById('birthDay');

    // 연도 채우기 (1900년부터 현재 연도까지)
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1900; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // 월 채우기
    for (let month = 1; month <= 12; month++) {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month + '월';
        monthSelect.appendChild(option);
    }

    // 월 변경 시 날짜 동적으로 변경
    function updateDays() {
        const year = yearSelect.value;
        const month = monthSelect.value;
        daySelect.innerHTML = '<option value="">일</option>';

        if (year && month) {
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const option = document.createElement('option');
                option.value = day;
                option.textContent = day + '일';
                daySelect.appendChild(option);
            }
        }
    }

    yearSelect.addEventListener('change', updateDays);
    monthSelect.addEventListener('change', updateDays);

    // 모든 필드 입력 검증 및 버튼 활성화
    const inputs = document.querySelectorAll('#signupForm input, #signupForm select');
    const signupButton = document.getElementById('signupButton');

    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
        input.addEventListener('change', validateForm);
    });

    function validateForm() {
        const allFieldsFilled = Array.from(inputs).every(input => input.value.trim() !== '');
        
        if (allFieldsFilled) {
            signupButton.disabled = false;
            signupButton.classList.add('active');
        } else {
            signupButton.disabled = true;
            signupButton.classList.remove('active');
        }
    }
};
 
 // 전화번호 하이픈 자동 생성 스크립트
document.getElementById('phone').addEventListener('input', function(e) {
const input = e.target.value.replace(/[^\d]/g, '');
let formatted = '';

if (input.length <= 3) {
    formatted = input;
} else if (input.length <= 7) {
    formatted = `${input.slice(0,3)}-${input.slice(3)}`;
} else {
    formatted = `${input.slice(0,3)}-${input.slice(3,7)}-${input.slice(7,11)}`;
}

e.target.value = formatted;
});

// 모달 관련 요소 선택
const resultModal = document.getElementById('resultModal');
const successContent = document.getElementById('successContent');
const errorContent = document.getElementById('errorContent');
const errorMessage = document.getElementById('errorMessage');
const goToLoginBtn = document.getElementById('goToLoginBtn');
const closeErrorBtn = document.getElementById('closeErrorBtn');

// 모달 표시 함수
function showModal(isSuccess, message = '') {
    successContent.style.display = isSuccess ? 'block' : 'none';
    errorContent.style.display = isSuccess ? 'none' : 'block';
    if (!isSuccess) {
        errorMessage.textContent = message;
    }
    resultModal.style.display = 'block';
}

// 모달 닫기 함수
function closeModal() {
    resultModal.style.display = 'none';
}

// 버튼 이벤트 리스너
goToLoginBtn.addEventListener('click', () => {
    window.location.href = 'signin.html';
});

closeErrorBtn.addEventListener('click', closeModal);

// 폼 제출 이벤트 수정
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // 생년월일 조합
    const birthYear = document.getElementById('birthYear').value;
    const birthMonth = document.getElementById('birthMonth').value.padStart(2, '0');
    const birthDay = document.getElementById('birthDay').value.padStart(2, '0');
    const birth_date = `${birthYear}-${birthMonth}-${birthDay}`;
    // 폼 데이터 수집
    const formData = {
        email: document.getElementById('email').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        gender: document.getElementById('gender').value,
        phone: document.getElementById('phone').value.replace(/-/g, ''),
        birth: birth_date
    };
    console.log(formData)

    try {
        const response = await fetch(`${backend_base_url}/user/signup/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        console.log('서버 응답:', data);  // 디버깅용 로그

        if (response.status === 201) {
            localStorage.removeItem('emailData');
            showModal(true);
        } else {
            // 백엔드에서 오는 에러 메시지 처리
            let errorMsg;
            if (typeof data === 'string') {
                // 문자열로 온 경우
                errorMsg = data;
            } else if (data.non_field_errors) {
                // non_field_errors 배열로 온 경우
                errorMsg = data.non_field_errors[0];
            } else if (data.message) {
                // message 필드로 온 경우
                errorMsg = data.message;
            } else {
                // 특정 필드의 에러로 온 경우
                const firstError = Object.entries(data)[0];
                if (Array.isArray(firstError[1])) {
                    errorMsg = firstError[1][0];  // 배열의 첫 번째 메시지
                } else {
                    errorMsg = firstError[1];  // 직접적인 메시지
                }
            }
            showModal(false, errorMsg || '회원가입 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        showModal(false, '서버 통신 중 오류가 발생했습니다.');
    }
});

// 페이지 이탈 시
window.addEventListener('beforeunload', function() {
    localStorage.removeItem('emailData');  // 'email' 대신 'emailData' 삭제
});