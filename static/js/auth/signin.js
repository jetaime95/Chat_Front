const backend_base_url = "https://${window.location.host}/api"

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault(); // 기본 동작 방지
    
    // 사용자 입력 값 가져오기
    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };
    // API 요청 보내기
    try {
        const response = await fetch(`${backend_base_url}/user/token/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        const response_json = await response.json()
        if (response.ok) {
            // 성공 처리
            localStorage.setItem("access", "Bearer "+response_json.access);
            localStorage.setItem("refresh", response_json.refresh);
          
            const base64Url = response_json.access.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        
            localStorage.setItem("payload", jsonPayload);
            window.location.href = 'main.html'; // 로그인 후 이동할 페이지
        } else {
            // 실패 처리
            const errorData = await response.text();
            alert(`로그인 실패: ${errorData}`);
        }
    } catch (error) {
        console.error('로그인 요청 실패:', error);
        alert('로그인 요청 중 문제가 발생했습니다.');
    }
});