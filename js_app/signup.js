document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
  
    form.addEventListener("submit", function (e) {
      e.preventDefault();
  
      const email = document.querySelector("input[type='email']").value;
      const password = document.querySelector("input[type='password']").value;
  
      auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
          alert("Registration successful!");
         
          window.location.href = "main.html";
        })
        .catch(error => {
          alert("Error: " + error.message);
        });
    });
  
    window.signUpWithGoogle = function () {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider)
        .then(result => {
          alert("Signed up with Google!");
          window.location.href = "main.html";
        })
        .catch(error => {
          alert("Google sign-up error: " + error.message);
        });
    };
  });
  