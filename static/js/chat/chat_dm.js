const backend_base_url = "https://13.209.15.78";

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room_id');
const token = localStorage.getItem('access');
const sendButton = document.getElementById('send-button');
const messageInput = document.getElementById('message-input');

document.addEventListener('DOMContentLoaded', function(){
    loadChatRoom(roomId);
    initializeWebSocket(roomId);

    sendButton.addEventListener('click', sendMessage);

    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});

function initializeWebSocket(roomId) {
    chatSocket = new WebSocket(`wss://13.209.15.78:8000/ws/chat/${roomId}/?token=${token}`);

    chatSocket.onopen = function() {
        console.log('WebSocket 연결 성공');
        authenticateWebSocket(); // WebSocket 연결 후 인증
    };
    chatSocket.onmessage = function (event) {
        const data = JSON.parse(event.data);
        console.log('WebSocket 수신:', data);

        switch (data.type) {
            case 'message':
                updateIndicator(data);
                displayMessages(data.message, true);
                break;
            case 'participants_info':
                updateParticipantInfo(data);
                break;
            case 'error':
                showError(data.message);
                break;
            default:
                console.error('알 수 없는 메시지:', data);
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

function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

async function loadChatRoom(roomId) {
    try {
        const response = await fetch(`${backend_base_url}/chat/direct/rooms/${roomId}/messages/`, {
            method: 'GET',
            headers: {
                'Authorization': localStorage.getItem('access'),
            },
        });

        if (response.ok) {
            const chatRoomData = await response.json();
            updateChatRoomUI(chatRoomData);
            displayMessages(chatRoomData.messages);
        } else {
            showError('채팅방을 불러올 수 없습니다.');
        }
    } catch (error) {
        console.error('채팅방 로드 중 오류 발생:', error);
        showError('채팅방 로드 중 오류가 발생했습니다.');
    }
}

function updateParticipantInfo(data) {
    if (data.type === 'participants_info' && Array.isArray(data.participants)) {
        // 채팅 컨테이너 내의 모든 메시지 요소 가져오기
        const chatMessagesContainer = document.getElementById('chat-messages');
        const messageElements = chatMessagesContainer.querySelectorAll('.message');
        
        // 각 참여자에 대해 반복
        data.participants.forEach(participant => {
            const username = participant.username;
            const isOnline = participant.is_online;
            const profileImageUrl = participant.profile_image_url;
            
            // 헤더에 표시된 참여자인지 확인
            const chatHeaderNameElement = document.querySelector('.chat-header-name');
            if (chatHeaderNameElement && chatHeaderNameElement.textContent === username) {
                // 헤더 상태 표시기 업데이트
                const headerStatusIndicator = document.querySelector('.header-status-indicator');
                if (headerStatusIndicator) {
                    headerStatusIndicator.classList.remove('online', 'offline');
                    headerStatusIndicator.classList.add(isOnline ? 'online' : 'offline');
                }
                
                // 헤더 프로필 이미지 업데이트
                const headerAvatarImage = document.querySelector('.header-avatar-image');
                if (headerAvatarImage && profileImageUrl) {
                    headerAvatarImage.src = backend_base_url + profileImageUrl;
                }
            }
            
            // 이 사용자의 모든 메시지 업데이트
            messageElements.forEach(messageElement => {
                const usernameElement = messageElement.querySelector('.message-username');
                if (usernameElement && usernameElement.textContent === username) {
                    const avatarElement = messageElement.querySelector('.chat-avatar');
                    
                    // 프로필 이미지 업데이트
                    const avatarImage = messageElement.querySelector('.chat-avatar-image');
                    if (avatarImage && profileImageUrl) {
                        avatarImage.src = backend_base_url + profileImageUrl;
                    }
                }
            });
        });
    }
}

function updateChatRoomUI(chatRoomData) {
    const chatHeaderNameElement = document.querySelector('.chat-header-name');
    const Participant = chatRoomData.other_participant.username;

    const ParticipantOnline = chatRoomData.other_participant.is_online;
    const statusIndicator = document.createElement('div');
    statusIndicator.classList.add('header-status-indicator');
    const profileImg = document.createElement('img');
    profileImg.classList.add('header-avatar-image');
    profileImg.src = backend_base_url + '/media/' + chatRoomData.other_participant.image;

    if (ParticipantOnline) {
        statusIndicator.classList.add('online');
    } else {
        statusIndicator.classList.add('offline');
    }

    const chatHeaderAvatar = document.querySelector('.chat-header-avatar');
    chatHeaderAvatar.appendChild(profileImg);
    // 새로운 상태 인디케이터 추가
    chatHeaderAvatar.appendChild(statusIndicator);
    // 채팅방 이름 업데이트
    chatHeaderNameElement.textContent = Participant;
}

function authenticateWebSocket() {
    const accessToken = localStorage.getItem('access');
    if (chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            type: 'authenticate',
            token: accessToken,
        }));
        console.log("인증")
    } else {
        console.error('WebSocket 연결이 열리지 않았습니다.');
    }
}

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const messageContent = messageInput.value.trim();

    if (messageContent && chatSocket.readyState === WebSocket.OPEN) {
        // 메시지를 WebSocket으로 전송
        chatSocket.send(JSON.stringify({
            type: 'message',
            message: messageContent,
        }));
        messageInput.value = '';
    } else {
        showError('메시지를 입력하거나 WebSocket 연결 상태를 확인하세요.');
    }
}

let displayedMessages = new Set();  // 이미 표시된 메시지를 추적

function displayMessages(messages) {
    const chatMessagesContainer = document.getElementById('chat-messages');
    const currentUsername = getUsernameFromToken();

    if (Array.isArray(messages)) {
        messages.forEach((message) => {
            if (!displayedMessages.has(message.id)) {
                const messageElement = createMessageElement(message, currentUsername);
                chatMessagesContainer.appendChild(messageElement);
                displayedMessages.add(message.id);  // 메시지 ID를 저장
            }
        });
    } else if (messages.id && !displayedMessages.has(messages.id)) {
        const messageElement = createMessageElement(messages, currentUsername);
        chatMessagesContainer.appendChild(messageElement);
        displayedMessages.add(messages.id);  // 메시지 ID를 저장
    }

    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function getUsernameFromToken() {
    const token = localStorage.getItem('access');
    if (token) {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        return payload.username;
    }
    return null;
}

function createMessageElement(message, currentUsername) {
    const messageElement = document.createElement('div');
    const isOwnMessage = message.sender_name === currentUsername;

    messageElement.className = `message ${isOwnMessage ? 'own-message' : ''}`;

    messageElement.innerHTML = `
        <div class="chat-avatar">
            <img class="chat-avatar-image" src="${backend_base_url}${message.sender_profile_image}">
        </div>
        <div class="message-info">
            <div class="message-header">
                <span class="message-username">${message.sender_name}</span>
                <span class="message-time">${formatMessageTime(message.created_at)}</span>
            </div>
            <div class="message-text">${message.content}</div>
        </div>
    `;

    return messageElement;
}

function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function updateIndicator(data) {
    const chatHeaderAvatar = document.querySelector('.chat-header-avatar');
    const statusIndicator = chatHeaderAvatar.querySelector('.header-status-indicator');

    if (statusIndicator) {
        statusIndicator.classList.remove('offline', 'online');
        statusIndicator.classList.add(data.is_online ? 'online' : 'offline');
    }
}