document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('auth-login-btn');
  const signupBtn = document.getElementById('auth-signup-btn');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const errorDiv = document.getElementById('auth-error');
  const authModal = document.getElementById('auth-modal');

  // Supabase client from window.supabaseClient
  const supabase = window.supabaseClient;

  if (!supabase) {
    errorDiv.innerText = "Error: Supabase client not initialized.";
    return;
  }

  // Listen to auth state changes
  // In Supabase v2, this also fires an INITIAL_SESSION event on page load if a session exists
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      window.currentUser = session.user;
      authModal.style.display = 'none';
      if (window.onAuthSuccess) window.onAuthSuccess();
    } else {
      window.currentUser = null;
      authModal.style.display = 'flex';
    }
  });

  loginBtn.addEventListener('click', async () => {
    errorDiv.innerText = '';
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
      errorDiv.innerText = 'Please enter email and password.';
      return;
    }

    loginBtn.disabled = true;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    loginBtn.disabled = false;

    if (error) {
      errorDiv.innerText = error.message;
    }
  });

  signupBtn.addEventListener('click', async () => {
    errorDiv.innerText = '';
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
      errorDiv.innerText = 'Please enter email and password.';
      return;
    }

    signupBtn.disabled = true;
    const { data, error } = await supabase.auth.signUp({ email, password });
    signupBtn.disabled = false;

    if (error) {
      errorDiv.innerText = error.message;
    } else if (data.user && data.session === null) {
      errorDiv.innerText = 'Check your email for the confirmation link.';
    }
  });
});