<script lang="ts">
  let {
    customers,
    isLoading,
    isAuthenticated = $bindable(false),
    passwordInput = $bindable(''),
    passwordError = $bindable(''),
    onPasswordSubmit,
    onSelectCustomer,
    onCreateCustomer,
    onDeleteCustomer
  }: {
    customers: Array<{ name: string; path: string }>;
    isLoading: boolean;
    isAuthenticated: boolean;
    passwordInput: string;
    passwordError: string;
    onPasswordSubmit: () => void;
    onSelectCustomer: (customerId: string) => void;
    onCreateCustomer: (customerId: string, password: string, displayName: string, uatEndDate: string, devUrl: string, uatFolderUrl: string, contactEmails: string) => void;
    onDeleteCustomer: (customerId: string) => void;
  } = $props();
  
  let showCreateForm = $state(false);
  let newCustomerId = $state('');
  let newCustomerPassword = $state('');
  let newDisplayName = $state('');
  let newUatEndDate = $state('');
  let newDevUrl = $state('');
  let newUatFolderUrl = $state('');
  let newContactEmails = $state('');
  let createError = $state('');
  let deleteConfirmId = $state<string | null>(null);
  let showPassword = $state(false);
  let showAdminPassword = $state(false);
  
  function handleSubmit(e: Event) {
    e.preventDefault();
    onPasswordSubmit();
  }

  function toggleShowAdminPassword() {
    showAdminPassword = !showAdminPassword;
  }
  function toggleShowPassword() {
    showPassword = !showPassword;
  }
  
  function toggleCreateForm() {
    showCreateForm = !showCreateForm;
    if (!showCreateForm) {
      newCustomerId = '';
      newCustomerPassword = '';
      newDisplayName = '';
      newUatEndDate = '';
      newDevUrl = '';
      newUatFolderUrl = '';
      newContactEmails = '';
      createError = '';
    }
  }
  
  function handleCreateSubmit(e: Event) {
    e.preventDefault();
    
    // Customer ID validation checks
    // Check if input contains only alphanumeric characters and spaces
    const validAlphaNumericPattern = /^[a-zA-Z0-9\s\-]+$/;
    
    if (!validAlphaNumericPattern.test(newCustomerId)) {
      createError = 'Input contains invalid characters. Only alphanumeric characters and spaces are allowed.';
      return
    } else {
      newCustomerId = newCustomerId.toLowerCase().replace(/[\s\-]+/g, '-');
    }

    if (!newCustomerId.trim()) {
      createError = 'Account ID is required';
      return;
    }
    
    // Check if password
    if (!newCustomerPassword.trim()) {
      createError = 'Password is required';
      return;
    }
    
    // Check if display name
    if (!newDisplayName.trim()) {
      createError = 'Display Name is required';
      return;
    }
    
    // Check if UAT end date
    if (!newUatEndDate.trim()) {
      createError = 'UAT End Date is required';
      return;
    }
    
    // Check if dev URL
    if (!newDevUrl.trim()) {
      createError = 'Dev URL is required';
      return;
    }
    
    // Check if account already exists
    if (customers.some(c => c.name === `${newCustomerId.toLowerCase()}.json`)) {
      createError = 'Account already exists';
      return;
    }
    
    onCreateCustomer(newCustomerId.toLowerCase(), newCustomerPassword, newDisplayName, newUatEndDate, newDevUrl, newUatFolderUrl, newContactEmails);
    
    // Reset form
    newCustomerId = '';
    newCustomerPassword = '';
    newDisplayName = '';
    newUatEndDate = '';
    newDevUrl = '';
    newUatFolderUrl = '';
    newContactEmails = '';
    createError = '';
    showCreateForm = false;
  }
  
  function handleDeleteClick(customerId: string, e: Event) {
    e.stopPropagation();
    deleteConfirmId = customerId;
  }
  
  function confirmDelete() {
    if (deleteConfirmId) {
      onDeleteCustomer(deleteConfirmId);
      deleteConfirmId = null;
    }
  }
  
  function cancelDelete() {
    deleteConfirmId = null;
  }
</script>

{#if !isAuthenticated}
  <div class="container admin-container">
    <div class="admin-box">
      <h1>Admin Access</h1>
      <p class="subtitle">Enter admin password to continue</p>
      
      <form onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="admin-password">Password</label>
          <div class="password-input">
            <input
              id="admin-password"
              type={showAdminPassword ? "text" : "password"}
              bind:value={passwordInput}
              placeholder="Enter admin password"
              disabled={isLoading}
            />
            <button aria-label="Toggle Password Visibility" class="password-toggle" type="button" onclick={toggleShowAdminPassword}>
              {#if showAdminPassword}
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#666' d='M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z'/></svg>
              {:else}
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#666' d='M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z'/></svg>
              {/if}
            </button>
          </div>
        </div>
        
        {#if passwordError}
          <div class="error-message">{passwordError}</div>
        {/if}
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Verifying...' : 'Access Admin'}
        </button>
      </form>
    </div>
  </div>
{:else}
  <div class="container admin-container">
    <div class="admin-box">
      <h1>Admin Mode</h1>
      <p class="subtitle">Select a customer to view their board</p>
      
      {#if isLoading}
        <div class="loading">Loading customers...</div>
      {:else if customers.length === 0}
        <p class="no-customers">No customer data files found.</p>
      {:else}
        <ul class="customer-list">
          {#each customers as customer}
            <li class="customer-item">
              <button 
                class="customer-button" 
                onclick={() => onSelectCustomer(customer.name.replace('.json', ''))}
              >
                {customer.name.replace('.json', '')}
              </button>
              <button
                class="delete-btn"
                onclick={(e) => handleDeleteClick(customer.name.replace('.json', ''), e)}
                title="Delete account"
              >
                🗑️
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      
      <div class="admin-actions">
        <button class="create-toggle-btn" onclick={toggleCreateForm}>
          {showCreateForm ? 'Cancel' : '+ Create New Account'}
        </button>
        
        {#if showCreateForm}
          <form class="create-form" onsubmit={handleCreateSubmit}>
            <div class="form-group">
              <label for="new-customer-id">Account ID</label>
              <input
                id="new-customer-id"
                type="text"
                bind:value={newCustomerId}
                placeholder="account-name"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="new-display-name">Display Name</label>
              <input
                id="new-display-name"
                type="text"
                bind:value={newDisplayName}
                placeholder="Account Display Name"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="new-uat-end-date">UAT End Date</label>
              <input
                id="new-uat-end-date"
                type="date"
                bind:value={newUatEndDate}
                required
              />
            </div>
            
            <div class="form-group">
              <label for="new-dev-url">Dev URL</label>
              <input
                id="new-dev-url"
                type="text"
                bind:value={newDevUrl}
                placeholder="https://linkto.reviewpage.com"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="new-uat-folder-url">UAT Folder URL (Optional. Used for uploading assets)</label>
              <input
                id="new-uat-folder-url"
                type="text"
                bind:value={newUatFolderUrl}
                placeholder="https://drive.google.com/..." 
              />
            </div>
            
            <div class="form-group">
              <label for="new-contact-emails">Contact Emails (Optional. Used for email alerts)</label>
              <input
                id="new-contact-emails"
                type="text"
                bind:value={newContactEmails}
                placeholder="email1@example.com, email2@example.com" 
              />
            </div>
            
            <div class="form-group">
              <label for="new-customer-password">Password</label>
              <div class="password-input">
                <input
                  id="new-customer-password"
                  type={showPassword ? "text" : "password"}
                  bind:value={newCustomerPassword}
                  placeholder="Enter password"
                  required
                />
                <button aria-label="Toggle Password Visibility" class="password-toggle" type="button" onclick={toggleShowPassword}>
                  {#if showPassword}
                    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#666' d='M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z'/></svg>
                  {:else}
                    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='#666' d='M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z'/></svg>
                  {/if}
                </button>
              </div>
            </div>
            
            {#if createError}
              <div class="error-message">{createError}</div>
            {/if}
            
            <div class="form-group">
              <button type="submit" class="create-submit-btn">
                Create Account
              </button>
            </div>
            <button class="create-toggle-btn" onclick={toggleCreateForm}>Cancel</button>
          </form>
        {/if}
      </div>
    </div>
  </div>
  
  {#if deleteConfirmId}
    <div
      class="modal-overlay"
      role="button"
      tabindex="0"
      aria-label="Close delete confirmation modal"
      onclick={cancelDelete}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { cancelDelete(); } }}
    >
      <div class="confirm-modal" role="alertdialog" tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <h2>Delete Account</h2>
        <p>Are you sure you want to delete <strong>{deleteConfirmId}</strong>?</p>
        <p class="warning">This will permanently delete their data file.</p>
        <div class="modal-actions">
          <button class="cancel-btn" onclick={cancelDelete}>Cancel</button>
          <button class="confirm-btn" onclick={confirmDelete}>Delete</button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .admin-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .admin-box {
    background: var(--bg-2);
    padding: 3rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 500px;
  }

  h1 {
    text-align: center;
    color: var(--fg-1);
    margin-bottom: 0.5rem;
  }

  .subtitle {
    text-align: center;
    color: var(--fg-2);
    margin-bottom: 2rem;
  }

  .loading,
  .no-customers {
    text-align: center;
    color: var(--fg-2);
    padding: 2rem;
  }

  .customer-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 60vh;
    overflow-y: auto;
  }

  .customer-item {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .customer-button {
    flex: 1;
    padding: 1rem;
    background: var(--bg-1);
    color: var(--fg-1);
    border: 2px solid var(--bg-3);
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .customer-button:hover {
    background: var(--bg-3);
    border-color: var(--primary);
  }

  .customer-button:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-light);
  }
  
  .delete-btn {
    padding: 0.75rem 1rem;
    background: var(--bg-1);
    color: var(--fg-1);
    border: 2px solid var(--bg-3);
    border-radius: 4px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .delete-btn:hover {
    background: #d32f2f;
    border-color: #d32f2f;
    color: white;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }

  .password-input {
    position: relative;
  }

  .password-input input {
    padding-right: 3rem; /* Make space for the button */
  }

  .password-toggle {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%) !important;
    padding: 0.25rem;
    border: none;
    background: transparent;
    cursor: pointer;
    height: 100%;
    width: auto;
    aspect-ratio: 1;
    box-shadow: none !important;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .password-toggle svg {
    width: 1.25rem;
    height: 1.25rem;
    display: block;
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
    border: 2px solid var(--bg-3);
    border-radius: 4px;
    font-size: 1rem;
    background: var(--bg-1);
    color: var(--fg-1);
    transition: border-color 0.2s;
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
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #ffebee;
    color: #c62828;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  form button {
    width: 100%;
    padding: 0.75rem;
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

  form button:hover:not(:disabled) {
    background: var(--primary-fg);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  form button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .admin-actions {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--bg-3);
  }
  
  .create-toggle-btn {
    width: 100%;
    padding: 0.75rem;
    background: var(--bg-1);
    color: var(--fg-1);
    border: 2px solid var(--primary);
    border-radius: var(--border-radius);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .create-toggle-btn:hover {
    background: var(--primary);
    color: white;
    box-shadow: var(--shadow-md);
  }
  
  .create-form {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: var(--bg-1);
    border-radius: 4px;
  }
  
  .create-submit-btn {
    width: 100%;
    padding: 0.75rem;
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
  
  .create-submit-btn:hover {
    background: var(--primary-fg);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .confirm-modal {
    background: var(--bg-2);
    padding: 2rem;
    border-radius: 8px;
    max-width: 400px;
    width: 90%;
  }
  
  .confirm-modal h2 {
    margin: 0 0 1rem 0;
    color: var(--fg-1);
  }
  
  .confirm-modal p {
    margin: 0.5rem 0;
    color: var(--fg-2);
  }
  
  .confirm-modal .warning {
    color: #d32f2f;
    font-weight: 600;
  }
  
  .modal-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .cancel-btn,
  .confirm-btn {
    flex: 1;
    padding: 0.75rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .cancel-btn {
    background: var(--bg-3);
    color: var(--fg-1);
  }
  
  .cancel-btn:hover {
    background: var(--bg-1);
  }
  
  .confirm-btn {
    background: #d32f2f;
    color: white;
  }
  
  .confirm-btn:hover {
    background: #b71c1c;
  }
</style>
