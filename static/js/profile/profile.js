const backend_base_url = "https://13.209.15.78:8000/api";

document.addEventListener('DOMContentLoaded', function(){
    loadUserProfile();
    checkLoginStatus();
});

function checkLoginStatus() {
    const accessToken = localStorage.getItem('access');
    if (!accessToken || isTokenExpired(accessToken)) {
        localStorage.removeItem('access');
        window.location.href = 'signin.html';
    }
}

// 토큰 및 인증 함수
function isTokenExpired(token) {
    if (!token) return true;
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() > exp;
}

async function loadUserProfile() {
    try {
        const response = await fetch(`${backend_base_url}/user/profile/`, {
            method: 'GET',
            headers: {
                'Authorization': localStorage.getItem('access'),
            },
        });

        if (response.ok) {
            const profileData = await response.json();
            console.log('프로필 데이터:', profileData);
            updateProfile(profileData);
        } else {
            showError('프로필을 불러올 수 없습니다.');
        }
    } catch (error) {
        console.error('프로필 로드 중 오류 발생:', error);
        showError('프로필 로드 중 오류가 발생했습니다.');
    }
}

function updateProfile(data) {
    console.log(data)
    const profileImage = data.image ? `${backend_base_url}${data.image}`: "/default-profile.png";
    // 가져온 데이터를 HTML 요소에 반영
    document.getElementById('avatar-img').src = profileImage || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('username').value = data.username || '';
    document.getElementById('phone').value = data.phone || '';

    if (data.birth) {
        const [year, month, day] = data.birth.split('-'); // "2004-11-18" -> ['2004', '11', '18']
        document.getElementById('birthYear').value = year;
        document.getElementById('birthMonth').value = month;
        updateDays();
        document.getElementById('birthDay').value = day;
    }
}

// 생년월일 select 옵션 생성
const yearSelect = document.getElementById('birthYear');
const monthSelect = document.getElementById('birthMonth');
const daySelect = document.getElementById('birthDay');

// 연도 옵션 생성 (1900년부터 현재 연도까지)
const currentYear = new Date().getFullYear();
for (let year = currentYear; year >= 1900; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
}

// 월 옵션 생성
for (let month = 1; month <= 12; month++) {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = month;
    monthSelect.appendChild(option);
}

// 일 옵션 생성
function updateDays() {
    const year = yearSelect.value;
    const month = monthSelect.value;
    
    if (year && month) {
        const daysInMonth = new Date(year, month, 0).getDate();
        daySelect.innerHTML = '<option value="">일</option>';
        
        for (let day = 1; day <= daysInMonth; day++) {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            daySelect.appendChild(option);
        }
    }
}

yearSelect.addEventListener('change', updateDays);
monthSelect.addEventListener('change', updateDays);

// 이미지 업로드 처리
const fileInput = document.getElementById('file-input');
const avatarImg = document.getElementById('avatar-img');

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            avatarImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// 계정 탈퇴 버튼 처리
document.querySelector('.delete-account-button').addEventListener('click', function() {
    window.location.href = 'delete_account.html';
});

// 취소 버튼 처리
document.querySelector('.cancel-button').addEventListener('click', function() {
    if (confirm('변경사항을 취소하시겠습니까?')) {
        window.location.href = 'main.html';
    }
});

// 폼 제출 처리
document.getElementById('profile-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const birthYear = document.getElementById('birthYear').value;
    const birthMonth = document.getElementById('birthMonth').value;
    const birthDay = document.getElementById('birthDay').value;
    // 생년월일 합치기
    const birthDate = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;

    const formData = new FormData();
    formData.append('username', document.getElementById('username').value);
    formData.append('phone', document.getElementById('phone').value);
    formData.append('birth', birthDate);

    const fileInput = document.getElementById('file-input');
    if (fileInput.files.length > 0) {
        formData.append('image', fileInput.files[0]);
    }


    try {
        const response = await fetch(`${backend_base_url}/user/profile/`, {
            method: 'PUT',
            headers: {
                'Authorization': localStorage.getItem('access'),
            },
            body: formData
        });

        const data = await response.json();
        console.log("서버 응답:", data);

        if (response.ok) {
            alert("프로필이 업데이트되었습니다!");
            window.location.href = 'main.html';
        } else {
            alert("오류 발생: " + data.error);
        }
    } catch (error) {
        console.error("에러 발생:", error);
        alert("서버와 통신 중 문제가 발생했습니다.");
    }
});