const backend_base_url = "http://127.0.0.1:8000"

let onlineUsers = new Set();

document.addEventListener('DOMContentLoaded', function() {
    initializeWebSocket();

    const tabs = document.querySelectorAll('.tab');
    const friendsList = document.querySelector('.friends-list');

    // 탭 클릭 이벤트 처리
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 활성 탭 스타일 변경
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // 선택된 탭에 따라 친구 목록 필터링
            const tabType = this.textContent;
            filterFriends(tabType);
        });
    });

    // 친구 목록 필터링 함수
    async function filterFriends(tabType) {
        try {
            let response;
            let friends = [];
    
            // 탭에 따라 다른 GET 요청을 보냄
            switch(tabType) {
                case '온라인':
                case '전체':
                    response = await fetch(`${backend_base_url}/user/friends/`, {
                        method: 'GET',
                        headers: {
                            "Authorization": localStorage.getItem("access"),
                        }
                    });
                    const data = await response.json();
                    friends = data.friends_requests; // 전체 친구 목록
                    if (tabType === '온라인') {
                        friends = friends.filter(friend => friend.is_online); // 온라인 친구만 필터링
                    }
                    break;
    
                case '친구 요청 보낸 목록':
                    response = await fetch(`${backend_base_url}/user/sent-friend-requests/`, {
                        method: 'GET',
                        headers: {
                            "Authorization": localStorage.getItem("access"),
                        }
                    });
                    const sentData = await response.json();
                    if (sentData.sent_requests) {
                        friends = sentData.sent_requests; // 요청 보낸 목록
                    }
                    break;
    
                case '친구 요청 받은 목록':
                    response = await fetch(`${backend_base_url}/user/received-friend-requests/`, {
                        method: 'GET',
                        headers: {
                            "Authorization": localStorage.getItem("access"),
                        }
                    });
                    const receivedData = await response.json();
                    if (receivedData.received_requests) {
                        friends = receivedData.received_requests; // 요청 받은 목록
                    }
                    break;
            }
    
            // 필터링된 친구 목록 표시
            displayFriends(friends, tabType);
        } catch (error) {
            console.error('친구 목록을 불러오는데 실패했습니다:', error);
            friendsList.innerHTML = '<p style="text-align: center; color: #ed4245;">데이터를 불러오는데 실패했습니다.</p>';
        }
    }
    
    function displayFriends(friends, tabType) {
        const friendsList = document.querySelector('.friends-list');
        friendsList.innerHTML = ''; // 기존 목록 초기화
    
        // 친구 목록이 비어 있는 경우 메시지 표시
        if (!friends || friends.length === 0) {
            friendsList.innerHTML = '<p style="text-align: center;">친구를 추가해주세요.</p>';
            return;
        }
    
        friends.forEach(friend => {
            let friendElement;
    
            if (tabType === '친구 요청 보낸 목록') {
                // 친구 요청 보낸 목록의 경우
                friendElement = `
                    <div class="friend-item">
                        <div class="friend-info">
                            <div class="friend-name">${friend.to_user || friend.username}</div>
                            <div class="friend-status">요청 상태: ${friend.status || '대기 중'}</div>
                            <div class="friend-created-at">
                                ${new Date(friend.created_at).toLocaleDateString('ko-KR', {
                                    month: '2-digit',
                                    day: '2-digit'
                                })} ${new Date(friend.created_at).toLocaleTimeString('ko-KR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                })}
                            </div>
                        </div>
                    </div>
                `;
            } else if (tabType === '친구 요청 받은 목록') {
                // 친구 요청 받은 목록의 경우
                friendElement = `
                    <div class="friend-item">
                        <div class="friend-info">
                            <div class="friend-name">${friend.from_user || friend.username}</div>
                            <div class="friend-status">요청 상태: ${friend.status || '대기 중'}</div>
                            <div class="friend-created-at">
                                ${new Date(friend.created_at).toLocaleDateString('ko-KR', {
                                    month: '2-digit',
                                    day: '2-digit'
                                })} ${new Date(friend.created_at).toLocaleTimeString('ko-KR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                })}
                            </div>
                        </div>
                        <div class="friend-actions">
                            <button class="accept-button" data-username="${friend.from_user || friend.username}">✅</button>
                            <button class="reject-button" data-username="${friend.from_user || friend.username}">❌</button>
                        </div>
                    </div>
                `;
            } else {
                // 전체 및 온라인 친구 목록의 경우
                friendElement = `
                    <div class="friend-item">
                        <div class="${friend.is_online ? 'online-indicator' : 'offline-indicator'}"></div>
                        <div class="friend-avatar"></div>
                        <div class="friend-info">
                            <div class="friend-name">${friend.username}</div>
                            <div class="friend-status">${getFriendStatus(friend)}</div>
                        </div>
                        <div class="friend-actions">
                            <button class="message-button" data-username="${friend.username}" data-user-id="${friend.id}">💬</button>
                            <div class="friend-dropdown">
                                <button class="friend-dropdown-toggle">⋮</button>
                                <div class="friend-dropdown-content">
                                    <button class="friend-dropdown-item delete-friend" data-username="${friend.username}">삭제하기</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
    
            friendsList.innerHTML += friendElement;
            // 채팅방
            const chatButtons = document.querySelectorAll('.message-button');
            chatButtons.forEach(button => {
                button.addEventListener('click', async function() {
                    const otherUserId = this.dataset.userId;
                    try {
                        // API 호출하여 채팅방 생성 또는 가져오기
                        const response = await fetch(`${backend_base_url}/chat/direct/rooms/create/`, {
                            method: 'POST',
                            headers: {
                                "Content-Type": 'application/json',
                                "Authorization": localStorage.getItem("access"),
                            },
                            body: JSON.stringify({
                                user_id : otherUserId
                            })
                        });
            
                        if (!response.ok) {
                            throw new Error('채팅방 생성 실패');
                        }
            
                        const data = await response.json();
                        
                        // 채팅방 페이지로 이동
                        window.location.href = `/chat_dm.html?room_id=${data.id}`;
            
                    } catch (error) {
                        console.error('Error:', error);
                        alert('채팅방을 생성하는 중 문제가 발생했습니다.');
                    }
                });
            });
        });
    
        // 친구 요청 수락 버튼 클릭 이벤트 리스너 
        const acceptButtons = document.querySelectorAll('.accept-button');
        acceptButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const username = e.target.dataset.username;
                try {
                    const response = await fetch(`${backend_base_url}/user/accept_friend_request/`, {
                        method: 'POST',
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": localStorage.getItem("access"),
                        },
                        body: JSON.stringify({
                            "username": username,
                        })
                    });
                    if (response.ok) {
                        alert('친구 요청을 수락했습니다.');
                        // 목록 새로고침
                        filterFriends('친구 요청 받은 목록');
                    } else {
                        alert('친구 요청 수락에 실패했습니다.');
                    }
                } catch (error) {
                    console.error('친구 요청 수락 중 오류 발생:', error);
                    alert('친구 요청 수락 중 오류가 발생했습니다.');
                }
            });
        });

         // 친구 거절 버튼 클릭 이벤트 리스너 추가
        const rejectButtons = document.querySelectorAll('.reject-button');
        rejectButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const username = e.target.dataset.username; // 거절할 친구의 사용자 이름
                const confirmReject = confirm(`${username} 친구 요청을 거절하시겠습니까?`); // 거절 확인

                if (confirmReject) {
                    try {
                        const response = await fetch(`${backend_base_url}/user/reject-friend-request/`, {
                            method: 'DELETE',
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": localStorage.getItem("access"),
                            },
                            body: JSON.stringify({ username }) // 요청 본문에 사용자 이름 포함
                        });

                        if (response.ok) {
                            alert('친구 요청을 거절했습니다.');
                            e.target.closest('.friend-item').remove(); // 해당 친구 항목 제거
                        } else {
                            alert('친구 요청 거절에 실패했습니다.');
                        }
                    } catch (error) {
                        console.error('친구 요청 거절 중 오류 발생:', error);
                        alert('친구 요청 거절 중 오류가 발생했습니다.');
                    }
                }
            });
        });

        // 친구 삭제 버튼 클릭 이벤트 리스너 추가
        const deleteButtons = document.querySelectorAll('.delete-friend');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const username = e.target.dataset.username; // 삭제할 친구의 사용자 이름
                const confirmDelete = confirm(`${username}을 삭제하시겠습니까?`); // 삭제 확인

                if (confirmDelete) {
                    try {
                        const response = await fetch(`${backend_base_url}/user/delete-friend/`, {
                            method: 'DELETE',
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": localStorage.getItem("access"),
                            },
                            body: JSON.stringify({ username }) // 요청 본문에 사용자 이름 포함
                        });

                        if (response.ok) {
                            alert('친구를 삭제했습니다.');
                            // 요청 성공 후 UI 업데이트 (예: 해당 친구 항목 제거)
                            e.target.closest('.friend-item').remove(); // 해당 친구 항목 제거
                        } else {
                            alert('친구 삭제에 실패했습니다.');
                        }
                    } catch (error) {
                        console.error('친구 삭제 중 오류 발생:', error);
                        alert('친구 삭제 중 오류가 발생했습니다.');
                    }
                }
            });
        });
    }

    // 초기 로드 시 '전체' 탭의 친구 목록 표시
    filterFriends('전체');

    // 모달 친구 추가 관련 요소
    const modal = document.getElementById('addFriendModal');
    const addFriendBtn = document.querySelector('.add-friend');
    const closeBtn = document.querySelector('.close');
    const searchInput = document.getElementById('friendSearchInput');
    const searchButton = document.getElementById('friendSearchButton');
    const searchResults = document.getElementById('searchResults');

    // 친구 추가 버튼 클릭 시 모달 표시
    addFriendBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    // 모달 닫기 버튼
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        searchInput.value = '';
        searchResults.innerHTML = '';
    });

    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            searchInput.value = '';
            searchResults.innerHTML = '';
        }
    });

    // 친구 검색 버튼 클릭 이벤트
    searchButton.addEventListener('click', async () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (!searchTerm) {
            alert('검색할 친구 이름을 입력해주세요.');
            return;
        }

        try {
            // 서버에서 친구 목록 가져오기
            const response = await fetch(`${backend_base_url}/user/search-users/?username=${searchTerm}`, {
                method: 'GET',
                headers: {
                    "Authorization": localStorage.getItem("access"),
                }
            });
            const data = await response.json(); // 응답을 JSON으로 변환
            const searchResults = data.users.filter(user => 
                user.username.toLowerCase().includes(searchTerm)
            );

            // 검색 결과 표시
            displaySearchResults(searchResults);
        } catch (error) {
            console.error('친구 검색 중 오류 발생:', error);
            searchResults.innerHTML = '<p class="error-message">검색 중 오류가 발생했습니다.</p>';
        }
    });

    // 검색 결과 표시 함수
    function displaySearchResults(users) {
        searchResults.innerHTML = '';
        if (users.length === 0) {
            searchResults.innerHTML = '<p style="color: #8e9297; text-align: center;">검색 결과가 없습니다.</p>';
            return;
        }

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'search-result-item';
            userElement.innerHTML = `
                <div class="user-info">
                    <div class="user-name">${user.username}</div>
                    <div style="color: #8e9297; font-size: 12px;">${user.is_online ? '온라인' : '오프라인'}</div>
                </div>
                <button class="add-friend-btn" data-username="${user.username}">친구 추가</button>
            `;
            searchResults.appendChild(userElement);
        });

        // 친구 추가 버튼 이벤트 리스너
        const addButtons = searchResults.querySelectorAll('.add-friend-btn');
        addButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const username = e.target.dataset.username;
                try {
                    const response = await fetch(`${backend_base_url}/user/send_friend_request/`, {
                        method: 'POST',
                        headers: {
                            "content-Type": "application/json",
                            "Authorization": localStorage.getItem("access"),
                        },
                        body: JSON.stringify({
                            "username":username,
                        })
                    });
                    if (response.ok) {
                        alert('친구 요청을 보냈습니다.');
                        e.target.disabled = true;
                        e.target.textContent = '요청됨';
                        e.target.style.backgroundColor = '#4f545c';
                    } else if (response.status === 400) {
                        const errorData = await response.json(); // 에러 메시지를 JSON으로 파싱
                        alert(`${errorData.message || '이미 추가 되어있는 친구입니다.'}`); // 에러 메시지 표시
                    } else {
                        alert('친구 요청을 보내는 중 오류가 발생했습니다.');
                    }
                } catch (error) {
                    console.error('친구 요청 중 오류 발생:', error);
                    alert('친구 요청 중 오류가 발생했습니다.');
                }
            });
        });
    }
});

function initializeWebSocket() {
    accessToken = localStorage.getItem('access');
    token = accessToken.replace('Bearer ', '');
    chatSocket = new WebSocket(`ws://127.0.0.1:8000/ws/user/status/?token=${token}`);

    chatSocket.onopen = function() {
        console.log('WebSocket 연결 성공');
        authenticateWebSocket(); // WebSocket 연결 후 인증
    };

    chatSocket.onmessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.type === 'status_update') {
            friend = data;
            const friendsList = document.querySelector('.friends-list');
            const friendItems = friendsList.querySelectorAll('.friend-item');
            
            friendItems.forEach(item => {
                const friendName = item.querySelector('.friend-name').textContent;
                if (friendName === friend.username) {
                    const statusElement = item.querySelector('.friend-status');
                    
                    // 상태 텍스트 업데이트
                    statusElement.textContent = getFriendStatus(friend);
                    
                    // 상태 인디케이터 업데이트
                    const statusIndicator = item.querySelector('.online-indicator, .offline-indicator');
                    if (statusIndicator) {
                        // 기존 상태 인디케이터를 제거
                        statusIndicator.remove();
                    }
        
                    // 새로운 인디케이터 생성
                    const newIndicator = document.createElement('div');
                    newIndicator.className = friend.is_online ? 'online-indicator' : 'offline-indicator';
                    // 새로운 인디케이터를 friend-item 안에 추가
                    item.prepend(newIndicator); // .friend-item 맨 앞에 추가
                }
            });
        }
    };

    chatSocket.onclose = function(event) {
        console.log('WebSocket 연결 닫힘:', event);
        showError('채팅 연결이 종료되었습니다. 페이지를 새로고침해 주세요.');
    };

    chatSocket.onerror = function(error) {
        console.error('WebSocket 오류 발생:', error);
        showError('연결 중 오류가 발생했습니다.');
    };
}

function authenticateWebSocket() {
    const accessToken = localStorage.getItem('access');
    if (chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            type: 'authenticate',
            token: accessToken,
        }));
    } else {
        console.error('WebSocket 연결이 열리지 않았습니다.');
    }
}

// 친구 상태 텍스트 생성 함수
function getFriendStatus(friend) {
    if (friend.is_online) {
        return `온라인 - 현재 접속중`;
    } else {
        const lastUpdated = new Date(friend.updated_at);
        const now = new Date();
        const diffMs = now - lastUpdated;
        const diffMinutes = Math.floor(diffMs / (1000 * 60)); // 분 단위 차이
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60)); // 시간 단위 차이
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // 일 단위 차이

        if (diffMinutes < 60) {
            return `오프라인 - ${diffMinutes}분 전`;
        } else if (diffHours < 24) {
            return `오프라인 - ${diffHours}시간 전`;
        } else {
            return `오프라인 - ${diffDays}일 전`;
        }
    }
}