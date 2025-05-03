// js/main.js

// TODO: Замени эти данные на свои из Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyAOKeEnQuV_bkKXq7lE08tEZ-S7CuAHXlw",
    authDomain: "swipies-ai.firebaseapp.com",
    projectId: "swipies-ai",
    storageBucket: "swipies-ai.firebasestorage.app",
    messagingSenderId: "705282430100",
    appId: "1:705282430100:web:bc179e131a6dea6b6f5081",
    measurementId: "G-E7MF4TNZ5T"
  };


  firebase.initializeApp(firebaseConfig);

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    const photoURL = user.photoURL;
    const profileImg = document.getElementById("profileImg");

    if (photoURL && profileImg) {
      profileImg.src = photoURL;
    }
  }
});



function showTab(tabId) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(el => {
      el.classList.remove('active');
    });

    // Показываем нужную
    document.getElementById(tabId).classList.add('active');

    // Меняем активный пункт меню
    document.querySelectorAll('.sidebar ul li').forEach(el => {
      el.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
  }