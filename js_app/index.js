import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authButtonsDiv = document.getElementById('auth-buttons');

onAuthStateChanged(auth, user => {
  if (user) {
    const userName = user.displayName || user.email || "User";

    // Стили
    const style = document.createElement('style');
    style.textContent = `
      .user-info {
        display: flex;
        align-items: center;
        gap: 10px;
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.9);
        padding: 6px 12px;
        border-radius: 12px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        font-family: 'Poppins', sans-serif;
        opacity: 0;
        transition: opacity 1s ease;
        z-index: 1000;
      }

      .user-info.visible {
        opacity: 1;
      }

      .user-icon {
        font-size: 18px;
      }

      .user-email {
        font-size: 14px;
        color: #333;
        max-width: 200px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .logout-btn {
        padding: 4px 10px;
        background-color: #000;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.3s ease;
      }

      .logout-btn:hover {
        background-color: #333;
      }
    `;
    document.head.appendChild(style);

    // HTML
    authButtonsDiv.innerHTML = `
      <div class="user-info" id="user-info">
        <span class="user-icon">👤</span>
        <span class="user-email">${userName}</span>
        
      </div>
    `;

    // Показ блока
    const userInfo = document.getElementById('user-info');
    requestAnimationFrame(() => {
      userInfo.classList.add('visible');
    });

    // Удаление через 6 секунд
    setTimeout(() => {
      userInfo.classList.remove('visible');
    }, 6000);

    // Выход
    document.getElementById('logout-btn').addEventListener('click', () => {
      auth.signOut();
      location.reload();
    });
  }

  
});

const startBtn = document.getElementById('start-btn');

if (startBtn) {
  startBtn.addEventListener('click', () => {
    onAuthStateChanged(auth, user => {
      if (user) {
        // Пользователь авторизован
        window.location.href = 'main.html';
      } else {
        // Пользователь не авторизован
        window.location.href = 'login.html';
      }
    });
  });
}
