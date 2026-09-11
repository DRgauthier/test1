document.addEventListener('DOMContentLoaded', () => {
  const authModal = document.getElementById('auth-modal');
  const mainMenu = document.getElementById('auth-main-menu');
  const formMenu = document.getElementById('auth-form-menu');

  const navLoginBtn = document.getElementById('nav-login-btn');
  const navSignupBtn = document.getElementById('nav-signup-btn');
  const navSettingsBtn = document.getElementById('nav-settings-btn');
  const backBtn = document.getElementById('auth-back-btn');

  const authTitle = document.getElementById('auth-title');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const errorDiv = document.getElementById('auth-error');

  let currentAuthMode = 'login'; // 'login' or 'signup'

  // Navigation Logic
  function showForm(mode) {
    currentAuthMode = mode;
    mainMenu.style.display = 'none';
    formMenu.style.display = 'block';
    errorDiv.innerText = '';
    emailInput.value = '';
    passwordInput.value = '';

    if (mode === 'login') {
      authTitle.innerText = 'Log in';
      authSubmitBtn.innerText = 'Log in';
      authSubmitBtn.style.background = '#4299e1';
    } else if (mode === 'signup') {
      authTitle.innerText = 'Sign up';
      authSubmitBtn.innerText = 'Sign up';
      authSubmitBtn.style.background = '#48bb78';
    }
  }

  navLoginBtn.addEventListener('click', () => showForm('login'));
  navSignupBtn.addEventListener('click', () => showForm('signup'));
  navSettingsBtn.addEventListener('click', () => alert('Settings not implemented yet.'));

  backBtn.addEventListener('click', () => {
    formMenu.style.display = 'none';
    mainMenu.style.display = 'block';
  });

  // Supabase Auth Logic
  const supabase = window.supabaseClient;

  if (!supabase) {
    errorDiv.innerText = "Error: Supabase client not initialized.";
    return;
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    console.log('[DEBUG] onAuthStateChange event fired:', _event, 'Session exists:', !!session);
    if (session) {
      window.currentUser = session.user;
      authModal.style.display = 'none';
      console.log('[DEBUG] Calling window.onAuthSuccess()');
      if (window.onAuthSuccess) window.onAuthSuccess();
    } else {
      window.currentUser = null;
      authModal.style.display = 'flex';
      mainMenu.style.display = 'block';
      formMenu.style.display = 'none';
    }
  });

  authSubmitBtn.addEventListener('click', async () => {
    errorDiv.innerText = '';
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
      errorDiv.innerText = 'Please enter email and password.';
      return;
    }

    authSubmitBtn.disabled = true;

    if (currentAuthMode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) errorDiv.innerText = error.message;
    } else if (currentAuthMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) {
        errorDiv.innerText = error.message;
      } else if (data.user && data.session === null) {
        errorDiv.innerText = 'Check your email for the confirmation link.';
      }
    }

    authSubmitBtn.disabled = false;
  });
});