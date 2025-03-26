const backend_base_url = "http://13.209.15.78:8000";

document.addEventListener('DOMContentLoaded', function() {
    const deleteForm = document.getElementById('delete-form');
    const passwordError = document.getElementById('password-error');
    const modal = document.getElementById('confirm-modal');

    deleteForm.addEventListener('submit', function(e) {
        e.preventDefault();
        passwordError.style.display = 'none';
        modal.style.display = 'flex';
    });
});

async function deleteAccount() {
    const password = document.getElementById('password').value;
    const passwordError = document.getElementById('password-error');

    try {
        const response = await fetch(`${backend_base_url}/user/profile/`, {
            method: 'POST',
            headers: {
                'Authorization': localStorage.getItem('access'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                password: password
            })
        });

        if (response.ok) {
            const result = await response.json();  // JSON으로 받기
            console.log(result.message)
            if (result.message === '성공') {
                localStorage.removeItem('access');  // 토큰 삭제
                window.location.href = 'signin.html';    // 로그인 페이지로 리다이렉트
            } else {
                passwordError.style.display = 'block';
                closeModal();
            }
        } else {
            passwordError.style.display = 'block';
            closeModal();
        }
    } catch (error) {
        console.error('계정 삭제 중 오류 발생:', error);
        alert('계정 삭제 중 오류가 발생했습니다.');
        closeModal();
    }
}

function closeModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('confirm-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}