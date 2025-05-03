document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
  
    form.addEventListener("submit", function (e) {
      e.preventDefault();
  
      const email = document.querySelector("input[type='email']").value;
      const password = document.querySelector("input[type='password']").value;
  
      auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
          alert("Login successful!");
          window.location.href = "main.html";
        })
        .catch(error => {
          alert("Login failed: " + error.message);
        });
    });
  
    window.signInWithGoogle = function () {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider)
        .then(result => {
          alert("Logged in with Google!");
           window.location.href = "main.html";
        })
        .catch(error => {
          alert("Google login error: " + error.message);
        });
    };
  });
  