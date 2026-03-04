<script lang="ts">
  let {
    usernameInput = $bindable<string>(''),
    passwordInput = $bindable<string>(''),
    passwordError = $bindable<string>(''),
    isLoading = $bindable<boolean>(false),
    onSubmit,
    onForgotPassword,
    onAdminLogin
  }: {
    usernameInput: string;
    passwordInput: string;
    passwordError: string;
    isLoading: boolean;
    onSubmit: () => void;
    onForgotPassword: () => void;
    onAdminLogin?: () => void;
  } = $props();

  function handleSubmit(e: Event) {
    e.preventDefault();
    onSubmit();
  }
</script>

<div class="container login-container">
  <div class="login-box">
    <form onsubmit={handleSubmit}>
      <div class="form-group">
        <label for="username">Username</label>
        <input 
          type="text" 
          id="username"
          bind:value={usernameInput}
          placeholder="Enter your username"
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input 
          type="password" 
          id="password"
          bind:value={passwordInput}
          placeholder="Enter your password"
          disabled={isLoading}
          required
        />
        {#if passwordError}
          <div class="error-message">{passwordError}</div>
        {/if}
      </div>
      
      <button type="submit" class="login-btn" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Access Board'}
      </button>
    </form>

    <p class="login-hint">
      <button type="button" class="forgot-password-link" onclick={onForgotPassword}>
        Forgot your password?
      </button>
      {#if onAdminLogin}
        <br />
        <button type="button" class="admin-login-link" onclick={onAdminLogin}>
          Login as admin
        </button>
      {/if}
    </p>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .login-box {
    background: var(--bg-2);
    padding: 3rem;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 400px;
    border: 1px solid var(--bg-3);
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--fg-1);
    font-weight: 600;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--bg-3);
    border-radius: var(--border-radius);
    font-size: 1rem;
    background: var(--bg-1);
    color: var(--fg-1);
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-light);
  }

  .form-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    margin-top: 0.5rem;
    padding: 0.625rem 0.875rem;
    background: #fef2f2;
    color: #991b1b;
    border-radius: var(--border-radius);
    font-size: 0.875rem;
    border: 1px solid var(--error);
  }

  .login-btn {
    width: 100%;
    padding: 0.875rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: var(--shadow-sm);
  }

  .login-btn:hover:not(:disabled) {
    background: var(--primary-hover);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }

  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .login-hint {
    margin-top: 1.5rem;
    text-align: center;
    color: var(--fg-2);
    font-size: 0.9rem;
  }
  
  .forgot-password-link {
    background: none;
    border: none;
    color: var(--primary);
    text-decoration: underline;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0;
    transition: color 0.2s;
  }
  
  .forgot-password-link:hover {
    color: var(--primary-hover);
  }

  .admin-login-link {
    background: none;
    border: none;
    color: var(--fg-1);
    text-decoration: underline;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0;
    margin-top: 0.5rem;
    transition: color 0.2s;
  }
  
  .admin-login-link:hover {
    color: var(--fg-2);
  }
</style>
