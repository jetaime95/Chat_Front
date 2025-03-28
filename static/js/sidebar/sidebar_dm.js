let dmSocket;

document.addEventListener('DOMContentLoaded', function() {
    initializeDmSocket();
    checkLoginStatus();
    Profile();
    directMessages();
    setupLogoutModal(); // 로그아웃 모달 설정 추가
});

document.addEventListener('click', handleGlobalClick);

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

// 프로필 관리
async function Profile() {
    const response = await fetch(`${backend_base_url}/user/profile/`, {
        method: 'GET',
        headers: {
            "Authorization": localStorage.getItem("access"),
        }
    });
    const response_json = await response.json();
    const username = response_json.username;
    const profileImage = response_json.image ? `${backend_base_url}${response_json.image}` : "/default-profile.png";
    if (username) {
        const profileNameElement = document.querySelector('.profile-name');
        profileNameElement.textContent = `${username}님`;
    }
    const profileImageElement = document.querySelector('.profile-image');
    if (profileImageElement) {
        profileImageElement.src = profileImage;
    }
}

// 다이렉트 메시지 관리
async function directMessages() {
    try {
        const response = await fetch(`${backend_base_url}/chat/direct/rooms/`, {
            method: 'GET',
            headers: {
                'Authorization': localStorage.getItem('access')
            }
        });

        if (!response.ok) throw new Error('DM 목록을 불러오는데 실패했습니다');

        const rooms = await response.json();
        const chatHTML = generateChatListHTML(rooms);
        document.querySelector('.chat-list').innerHTML = chatHTML;

    } catch (error) {
        console.error('DM 로딩 오류:', error);
    }
}

// 채팅 아이템 클릭 이벤트 추가
document.addEventListener("click", function (event) {
    const chatItem = event.target.closest(".chat-item"); // 클릭한 요소의 가장 가까운 .chat-item 찾기
    if (chatItem) {
        const chatId = chatItem.getAttribute("data-room-id");
        // 페이지 이동 (채팅방 URL로 변경)
        window.location.href = `chat_dm.html?room_id=${chatId}`;
    }
});

function formatTime(timeString) {
    const time = new Date(timeString);  // 시간 데이터를 Date 객체로 변환
    const hours = time.getHours().toString().padStart(2, '0');  // 시를 두 자릿수로 포맷
    const minutes = time.getMinutes().toString().padStart(2, '0');  // 분을 두 자릿수로 포맷
    return `${hours}:${minutes}`;
}

function generateChatListHTML(rooms) {
    let html = '';
    let totalUnreadCount = 0; // 읽지 않은 메시지 총합

    for (let i = 0; i < rooms.length; i++) {
        const participant = rooms[i].other_participant.username;
        const lastMessage = rooms[i].last_message || {};
        const time = formatTime(rooms[i].last_message?.created_at || '');
        const unreadCount = rooms[i].unread_count || 0;
        const roomId = rooms[i].id;
        const profileImageElement = '/media/' +rooms[i].other_participant.image;
        totalUnreadCount += unreadCount; // 읽지 않은 메시지 총합 계산

        html += `
            <div class="chat-item" data-room-id="${roomId}">
                <div class="chat-avatar">
                    <img class="profile-image" src="${backend_base_url}${profileImageElement}">
                    <div class="status-indicator ${rooms[i].other_participant.is_online ? 'online' : 'offline'}"></div>
                </div>
                <div class="chat-info">
                    <div class="chat-name">${participant}</div>
                    <div class="chat-preview">${lastMessage.content || ''}</div>
                </div>
                <div class="chat-meta">
                    <div class="chat-time">${time}</div>
                    ${unreadCount ? `<div class="unread-count">${unreadCount}</div>` : ''}
                </div>
            </div>
        `;
    }

    // 읽지 않은 메시지 총합 업데이트
    updateTotalUnreadCount(totalUnreadCount);

    return html;
}

function initializeDmSocket() {
    const token = localStorage.getItem('access');
    const dmSocket = new WebSocket(`wss://13.209.15.78:8000/ws/chat/sidebar/?token=${token}`);

    dmSocket.onopen = function() {
        console.log('WebSocket 연결 성공');
    };

    dmSocket.onmessage = function(event) {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'chat_room_list':
                updateChatRoom(data); // 실시간으로 메시지 업데이트
                break;
            case 'status_update':
                updateUserStatus(data)
                break;
            case 'error':
                console.error('WebSocket 오류:', data.message);
                break;
            default:
                console.error('알 수 없는 메시지 타입:', data);
        }
    };

    dmSocket.onclose = function() {
        console.log(`WebSocket 연결 종료`);
    };

    dmSocket.onerror = function(error) {
        console.error('WebSocket 오류:', error);
    };
}

function addChatRoomClickListener() {
    const chatItems = document.querySelector('.chat-item');

    chatItems.forEach(item => {
        item.addEventListener('click', function() {
            const roomId = this.getAttribute('data-room-id');
            window.location.href =  `/chat_dm.html?room_id=${roomId}`;  // 해당 채팅방으로 이동 (URL을 실제 경로에 맞게 수정)
        });
    });
}

// 실시간 사이드바 채팅방 업데이트
function updateChatRoom(data) {
    let totalUnreadCount = 0; // 실시간 총합 초기화

    for (let i = 0; i < data.rooms.length; i++) {
        const roomId = data.rooms[i].id;
        let chatItem = document.querySelector(`.chat-item[data-room-id="${roomId}"]`);
        const chatPreview = chatItem.querySelector('.chat-preview');
        const chatTime = chatItem.querySelector('.chat-time');
        const chatProfile = chatItem.querySelector('.profile-image');
        let unreadCountElement = chatItem.querySelector('.unread-count');

        chatPreview.textContent = data.rooms[i].last_message?.content || '';
        chatTime.textContent = formatTime(data.rooms[i].last_message?.created_at || '');
        chatProfile.src = backend_base_url + '/media/' + data.rooms[i].other_participant.image;

        const chatStatus = chatItem.querySelector('.status-indicator')
        if (data.rooms[i].other_participant.is_online) {
            chatStatus.classList.remove('offline');
            chatStatus.classList.add('online');
        } else {
            chatStatus.classList.remove('online');
            chatStatus.classList.add('offline');
        }

        // 새로운 읽지 않은 메시지 개수 가져오기
        const currentUnreadCount = data.rooms[i].unread_count || 0;
        totalUnreadCount += currentUnreadCount;

        if (currentUnreadCount > 0) {
            if (unreadCountElement) {
                unreadCountElement.textContent = currentUnreadCount;
            } else {
                unreadCountElement = document.createElement('div');
                unreadCountElement.className = 'unread-count';
                unreadCountElement.textContent = currentUnreadCount;
                chatItem.querySelector('.chat-meta').appendChild(unreadCountElement);
            }
        } else if (unreadCountElement) {
            unreadCountElement.remove();
        }
    }

    // 실시간 업데이트
    updateTotalUnreadCount(totalUnreadCount);
}

function updateTotalUnreadCount(count) {
    const dmCountElement = document.querySelector(".dm-count");
    if (dmCountElement) {
        dmCountElement.textContent = count > 0 ? count : "";
    }
}

function updateUserStatus(data) {
    const chatItem = document.querySelector(`.chat-item[data-room-id="${data.room_id}"]`);
    if (chatItem) {
        const statusIndicator = chatItem.querySelector('.status-indicator');
        if (data.is_online) {
            statusIndicator.classList.add('online');
            statusIndicator.classList.remove('offline');
        } else {
            statusIndicator.classList.add('offline');
            statusIndicator.classList.remove('online');
        }
    }
}

function handleDropdownToggle(e) {
    e.stopPropagation();
    const dropdownContent = e.target.nextElementSibling;
    closeAllDropdowns();
    dropdownContent?.classList.toggle('show');
}

function handleProfileButtonClick(e) {
    e.stopPropagation();
    let dropdownContent = e.target.nextElementSibling;
    
    if (!dropdownContent?.classList.contains('profile-dropdown-content')) {
        dropdownContent = createProfileDropdown();
        e.target.parentNode.appendChild(dropdownContent);
    }
    
    closeAllDropdowns();
    dropdownContent.classList.toggle('show');
}

function createProfileDropdown() {
    const dropdown = document.createElement('div');
    dropdown.className = 'profile-dropdown-content';
    dropdown.innerHTML = `
        <button class="dropdown-item" data-action="edit-profile">프로필 수정</button>
        <button class="dropdown-item" data-action="logout">로그아웃</button>
    `;
    return dropdown;
}

function closeAllDropdowns() {
    const allDropdowns = document.querySelectorAll('.friend-dropdown-content, .profile-dropdown-content');
    allDropdowns.forEach(dropdown => dropdown.classList.remove('show'));
}

async function handleGlobalClick(e) {
    // 홈 아이콘 클릭
    if (e.target.matches('#home-icon')) {
        window.location.href = 'main.html';
        return;
    }

    // 친구 드롭다운 토글 클릭
    if (e.target.matches('.friend-dropdown-toggle')) {
        handleDropdownToggle(e);
        return;
    }

    // 프로필 버튼 클릭
    if (e.target.matches('.profile-button')) {
        handleProfileButtonClick(e);
        return;
    }

    // 드롭다운, 프로필 버튼 영역 외 클릭 시
    if (!e.target.closest('.dropdown, .profile-button')) {
        closeAllDropdowns();
    }

    if (e.target.matches('#editProfileButton')) {
        window.location.href = 'profile.html';
        return;
    }

    // 로그아웃 모달 관련 처리
    if (e.target.matches('#logoutButton')) {
        const logoutModal = document.getElementById('logoutModal');
        logoutModal.style.display = 'block';
        return;
    }

    if (e.target.matches('#closeLogoutModal')) {
        const logoutModal = document.getElementById('logoutModal');
        logoutModal.style.display = 'none';
        return;
    }

    // 로그아웃 버튼 클릭 시 처리
    if (e.target.matches('#confirmLogout')) {
        const accessToken = localStorage.getItem('access');
        const refreshToken = localStorage.getItem('refresh');  // refresh token도 필요합니다.

        try {
            const response = await fetch(`${backend_base_url}/user/logout/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': accessToken,
                },
                body: JSON.stringify({
                    refresh: refreshToken,  // 클라이언트에서 전달된 refresh token
                }),
            });

            if (response.ok) {
                // 로그아웃 성공 시, 로컬 스토리지에서 access token과 refresh token 삭제
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                
                // 로그인 페이지로 리디렉션
                window.location.href = 'signin.html';
            } else {
                const errorData = await response.json();
                alert(`로그아웃 실패: ${errorData.error || '알 수 없는 오류'}`);
            }
        } catch (error) {
            console.error('로그아웃 중 오류 발생:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
        }

        // 로그아웃 모달 닫기
        const logoutModal = document.getElementById('logoutModal');
        logoutModal.style.display = 'none';
        return;
    }

    // 모달 외부 클릭 시 모달 닫기
    if (e.target.matches('#logoutModal')) {
        e.target.style.display = 'none';
    }
}

// 로그아웃 모달 설정
function setupLogoutModal() {
    // 만약 모달 HTML이 없다면 동적으로 생성
    if (!document.getElementById('logoutModal')) {
        const modalHTML = `
            <div id="logoutModal" class="modal">
                <div class="modal-content">
                    <h2>로그아웃</h2>
                    <p>정말 로그아웃 하시겠습니까?</p>
                    <div class="modal-buttons">
                        <button id="closeLogoutModal">취소</button>
                        <button id="confirmLogout">확인</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}
