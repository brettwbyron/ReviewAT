<script lang="ts">
  import type { Column, Task, ModalData, Toast, TaskType, OwnerType, ColumnId, BoardData, ConflictData, FeedbackItem } from '$lib/types';
  import { Octokit } from 'octokit';
  import { hashPassword, listAllDataFromGitHub, loadDataFromGitHub, loadDataFromGitHubAdmin, saveDataToGitHub, deleteDataFromGitHub, getDefaultColumns, fetchCurrentBoardData, detectConflicts } from '$lib/utils';
  import type { GitHubConfig } from '$lib/utils';
  import { goto } from '$app/navigation';
  
  // Components
  import ToastComponent from '$lib/components/Toast.svelte';
  import ButtonComponent from '$lib/components/Button.svelte';
  import Login from '$lib/components/Login.svelte';
  import AdminList from '$lib/components/AdminList.svelte';
  import Board from '$lib/components/Board.svelte';
  import TaskModal from '$lib/components/TaskModal.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import HelpModal from '$lib/components/HelpModal.svelte';
  import ConflictModal from '$lib/components/ConflictModal.svelte';
  import Landing from '$lib/components/Landing.svelte';

  // Route props
  let { isAdminRoute = false, customerRoute = '' }: { isAdminRoute?: boolean; customerRoute?: string } = $props();

  // GitHub Configuration from environment variables
  const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER || 'your-github-username';
  const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || 'uat-app';
  const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || 'your-github-token';
  const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'data';
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'password-for-admin-login';

  // Initialize Octokit with retry disabled for 409 errors
  const octokit = new Octokit({ 
    auth: GITHUB_TOKEN,
    retry: {
      enabled: false  // Disable automatic retries - we handle conflicts manually
    }
  });
  const githubConfig: GitHubConfig = {
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    token: GITHUB_TOKEN,
    branch: GITHUB_BRANCH
  };

  // Customer and authentication state
  let customerId = $state('');
  let isAuthenticated = $state(false);
  let isAdmin = $state(false);
  let usernameInput = $state('');
  let passwordInput = $state('');
  let passwordError = $state('');
  let isLoading = $state(false);
  let isSaving = $state(false);
  let hasPendingSave = $state(false);
  let fileSha = $state<string | null>(null);
  let storedPasswordHash = $state<string>(''); // Store original password hash
  let displayName = $state<string>('');
  let uatEndDate = $state<string>('');
  let devSiteUrl = $state<string>('');
  let uatFolderUrl = $state<string>('');
  let contactEmails = $state<string>('');
  let version = $state<number>(0);
  
  // Conflict detection state
  let originalColumns = $state<Column[]>([]);
  let originalVersion = $state<number | undefined>(undefined);
  let showConflictModal = $state(false);
  let conflictData = $state<ConflictData>({
    hasConflict: false,
    localChanges: [],
    remoteChanges: []
  });
  let remoteSha = $state<string | undefined>(undefined); // Store remote SHA for conflict resolution
  let isLoadingRemoteData = $state(false); // Loading state for fetching remote data
  
  // Admin mode
  let isAdminMode = $state(false);
  let isAdminAuthenticated = $state(false);
  let adminPasswordInput = $state('');
  let adminPasswordError = $state('');
  let adminCustomers = $state<Array<{ name: string; path: string }>>([]);

  // View mode for unauthenticted users on root route
  type ViewMode = 'landing' | 'customerLogin' | 'adminLogin';
  let viewMode = $state<ViewMode>('landing');

  // Session storage helpers
  function getSessionKey(id: string): string {
    return `uat-session-${id}`;
  }

  function saveSession(id: string, isAdminUser: boolean) {
    const sessionData = {
      customerId: id,
      isAdmin: isAdminUser,
      timestamp: Date.now()
    };
    sessionStorage.setItem(getSessionKey(id), JSON.stringify(sessionData));
  }

  function loadSession(id: string): { customerId: string; isAdmin: boolean } | null {
    const data = sessionStorage.getItem(getSessionKey(id));
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  function clearSession(id: string) {
    sessionStorage.removeItem(getSessionKey(id));
  }

  function clearAllCustomerSessions() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('uat-session-') && key !== 'uat-session-admin') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  }

  // View mode navigation functions
  function showCustomerLogin() {
    viewMode = 'customerLogin';
  }

  function showAdminLogin() {
    viewMode = 'adminLogin';
    isAdminMode = true;
  }

  // Navigate to account page
  function goToAccount(path: string) {
    goto(path);
  }

  // Toggle admin capabilities on customer routes
  function toggleAdminView() {
    isAdmin = !isAdmin;
  }

  // Logout function
  function logout() {
    // Clear appropriate session
    if (isAdminAuthenticated) {
      clearSession('admin');
    }
    if (isAuthenticated && customerId) {
      clearSession(customerId);
    }
    
    // Reset state
    isAuthenticated = false;
    isAdminAuthenticated = false;
    isAdminMode = false;
    isAdmin = false;
    
    // Navigate to landing page
    goto('/');
  }

  // Load data with session restore
  async function loadCustomerWithSession(id: string) {
    isLoading = true;
    const result = await loadDataFromGitHubAdmin(octokit, githubConfig, id);
    
    if (result.success && result.data) {
      columns = result.data;
      isAuthenticated = true;
      
      // Store original state for conflict detection
      originalColumns = JSON.parse(JSON.stringify(result.data));
      originalVersion = result.version || 0;
      version = result.version || 0;
      
      if (result.sha) {
        fileSha = result.sha;
      }
      
      if (result.passwordHash) {
        storedPasswordHash = result.passwordHash;
      }
      
      disableAddTask = result.disableAddTask || false;
      displayName = result.displayName || '';
      uatEndDate = result.uatEndDate || '';
      devSiteUrl = result.devSiteUrl || '';
      uatFolderUrl = result.uatFolderUrl || '';
      contactEmails = result.contactEmails || '';
    }
    
    isLoading = false;
  }



  // Track previous context to clear session on switch
  let previousContext = $state<string>('');

  // Initialize based on route props
  $effect(() => {
    // Determine current context from route props
    const currentContext = isAdminRoute ? 'admin' : (customerRoute || '');
    
    // Clear previous session if context changed
    if (previousContext && previousContext !== currentContext) {
      // Only clear if switching between different non-root contexts
      if (currentContext !== '') {
        clearSession(previousContext);
      }
      // Reset authentication state when switching
      isAuthenticated = false;
      isAdminAuthenticated = false;
      isAdminMode = false;
      passwordInput = '';
      adminPasswordInput = '';
      passwordError = '';
      adminPasswordError = '';
    }
    
    previousContext = currentContext;
    
    // Always check for admin session (works for all routes)
    const adminSession = loadSession('admin');
    if (adminSession && adminSession.customerId === 'admin') {
      isAdminAuthenticated = true;
      if (isAdminRoute) {
        isAdminMode = true;
        loadAdminCustomers();
      }
    }
    
    if (customerRoute) {
      // On customer route
      customerId = customerRoute;
      usernameInput = customerRoute;
      
      if (isAdminAuthenticated) {
        // Admin viewing customer board - no customer login needed
        isAuthenticated = true;
        isAdmin = true; // Default to admin view
        loadCustomerWithSession(customerRoute);
      } else {
        // Check for specific customer session
        const session = loadSession(customerRoute);
        if (session && session.customerId === customerRoute) {
          isAdmin = session.isAdmin;
          loadCustomerWithSession(customerRoute);
        }
      }
    } else if (!isAdminRoute) {
      // On root route - scan for any customer session
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('uat-session-') && key !== 'uat-session-admin') {
          const sessionCustomerId = key.replace('uat-session-', '');
          const session = loadSession(sessionCustomerId);
          if (session && session.customerId === sessionCustomerId) {
            customerId = sessionCustomerId;
            usernameInput = sessionCustomerId;
            isAdmin = session.isAdmin;
            isAuthenticated = true;
            break;
          }
        }
      }
      
      if (!isAuthenticated) {
        customerId = usernameInput;
      }
    }
  });

  // Board data
  let columns = $state<Column[]>(getDefaultColumns());
  let draggedItem = $state<Task | null>(null);
  let draggedFromColumn = $state<ColumnId | null>(null);
  let dragOverColumn = $state<ColumnId | null>(null);
  let disableAddTask = $state(false);
  
  // Modal state
  let showModal = $state(false);
  let selectedItem = $state<Task | null>(null);
  let selectedColumnId = $state<ColumnId>('todo');
  let originalColumnId = $state<ColumnId | null>(null);
  let isNewItem = $state(false);
  let isModalViewOnly = $state(false);
  let modalData = $state<ModalData>({
    description: '',
    device: 'All',
    feedback: [],
    section: '',
    images: []
  });

  // Search and filter state
  let searchQuery = $state('');
  let filterType = $state<TaskType | 'All'>('All');
  let filterOwner = $state<OwnerType | 'All'>('All');

  // Toast notifications
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  // Confirmation modals
  let showDeleteConfirm = $state(false);
  let showUnsavedChanges = $state(false);
  let showHelpModal = $state(false);

  // Validation
  let validationError = $state('');

  // Track original data for unsaved changes
  let originalModalData = $state<ModalData | null>(null);

  // Verify admin password
  function handleAdminPasswordSubmit() {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      isAdminAuthenticated = true;
      adminPasswordError = '';
      clearAllCustomerSessions(); // Clear any customer sessions
      saveSession('admin', true); // Save admin session
      loadAdminCustomers();
      goto('/admin');
    } else {
      adminPasswordError = 'Incorrect admin password';
    }
  }
  
  // Load customer list for admin mode
  async function loadAdminCustomers() {
    isLoading = true;
    const dataList = await listAllDataFromGitHub(octokit, githubConfig);
    if (dataList && Array.isArray(dataList)) {
      adminCustomers = dataList;
    } else {
      adminCustomers = [];
    }
    isLoading = false;
  }
  
  // Handle admin customer selection
  function handleAdminSelectCustomer(selectedCustomerId: string) {
    goto(`/${selectedCustomerId}`);
  }
  
  // Handle admin customer creation
  async function handleAdminCreateCustomer(customerId: string, password: string, displayName: string, uatEndDate: string, devUrl: string, uatFolderUrl: string, contactEmails: string) {
    isLoading = true;
    
    const boardData: BoardData = {
      displayName: displayName,
      uatEndDate: uatEndDate,
      devSiteUrl: devUrl,
      uatFolderUrl: uatFolderUrl || undefined,
      contactEmails: contactEmails || undefined,
      passwordHash: await hashPassword(password),
      version: 0,
      columns: getDefaultColumns(),
      disableAddTask: false
    };
    
    const result = await saveDataToGitHub(octokit, githubConfig, customerId, boardData, 'Create new customer account');
    
    if (result.success) {
      showToast(`Customer '${customerId}' created. Changes may take a few minutes to appear due to GitHub API caching.`, 'success');
      // Reload customer list
      await loadAdminCustomers();
    } else {
      showToast(result.error || 'Failed to create customer', 'error');
    }
    
    isLoading = false;
  }
  
  // Handle admin customer deletion
  async function handleAdminDeleteCustomer(customerId: string) {
    isLoading = true;
    
    const result = await deleteDataFromGitHub(octokit, githubConfig, customerId);
    
    if (result.success) {
      showToast(`Customer '${customerId}' deleted. Changes may take a few minutes to appear due to GitHub API caching.`, 'success');
      // Reload customer list
      await loadAdminCustomers();
    } else {
      showToast('Failed to delete customer', 'error');
    }
    
    isLoading = false;
  }
  
  // Handle account info update
  async function handleUpdateAccountInfo(newDisplayName: string, newUatEndDate: string, newDevSiteUrl: string, newUatFolderUrl: string, newContactEmails: string, newPassword: string) {
    displayName = newDisplayName;
    uatEndDate = newUatEndDate;
    devSiteUrl = newDevSiteUrl;
    uatFolderUrl = newUatFolderUrl;
    contactEmails = newContactEmails;
    
    // Hash new password if provided, otherwise keep existing
    if (newPassword.trim()) {
      storedPasswordHash = await hashPassword(newPassword);
    }
    
    await handleSave();
  }

  // Handle password submission
  async function handlePasswordSubmit() {
    if (!passwordInput.trim()) {
      passwordError = 'Please enter a password';
      return;
    }

    isLoading = true;
    const id = usernameInput.toLowerCase();
    
    const result = await loadDataFromGitHub(octokit, githubConfig, id, passwordInput);
    
    if (result.success && result.data) {
      columns = result.data;
      isAuthenticated = true;
      isAdmin = false; // Regular user login
      
      // Store original state for conflict detection
      originalColumns = JSON.parse(JSON.stringify(result.data));
      originalVersion = result.version || 0;
      version = result.version || 0;
      
      // Store SHA for future updates
      if (result.sha) {
        fileSha = result.sha;
      }
      
      // Store password hash to reuse on saves
      if (result.passwordHash) {
        storedPasswordHash = result.passwordHash;
      }
      
      // Load disableAddTask setting
      disableAddTask = result.disableAddTask || false;
      displayName = result.displayName || '';
      uatEndDate = result.uatEndDate || '';
      devSiteUrl = result.devSiteUrl || '';
      contactEmails = result.contactEmails || '';
      
      // Save session for this customer
      saveSession(id, false);
      
      showToast('Data loaded successfully', 'success');
      
      // Navigate to customer route so session persists on reload
      goto(`/${id}`);
    } else {
      passwordError = result.error || 'Login failed';
    }
    
    isLoading = false;
  }

  // Simple save function called after user actions
  async function handleSave() {
    if (!isAuthenticated || !columns || columns.length === 0) return;
    
    // If already saving, mark that we need another save after this one
    if (isSaving) {
      hasPendingSave = true;
      return;
    }
    
    isSaving = true;
    hasPendingSave = false;
    
    await performSave();
  }

  // Actual save logic extracted for reuse
  async function performSave() {
    try {
      const boardData: BoardData = {
        displayName,
        uatEndDate,
        devSiteUrl,
        uatFolderUrl,
        contactEmails,
        passwordHash: storedPasswordHash,
        version,
        columns,
        disableAddTask
      };
      
      const id = usernameInput.toLowerCase();
      const result = await saveDataToGitHub(octokit, githubConfig, id, boardData, 'Save changes', fileSha);
      
      if (result.success) {
        if (result.sha) {
          fileSha = result.sha;
        }
        
        // Update original state after successful save
        originalColumns = JSON.parse(JSON.stringify(columns));
        version = version + 1;
        originalVersion = version;
        
        showToast('Changes saved', 'success');
      } else if (result.conflict) {
        // 409 conflict detected - fetch current data and show conflict modal
        const remoteDataResult = await fetchCurrentBoardData(octokit, githubConfig, id);
        
        if (remoteDataResult.success && remoteDataResult.data) {
          // Store the remote SHA for reference
          remoteSha = remoteDataResult.sha;
          
          const conflicts = detectConflicts(
            originalColumns,
            columns,
            remoteDataResult.data,
            originalVersion,
            true  // Force conflict detection since we got a 409
          );
          
          // Show conflict modal
          conflictData = conflicts;
          showConflictModal = true;
          
          // Clear pending saves - user must resolve conflict first
          hasPendingSave = false;
        } else {
          showToast('Conflict detected but unable to fetch remote changes', 'error');
        }
      } else {
        showToast(result.error || 'Failed to save changes', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('Failed to save changes', 'error');
    } finally {
      isSaving = false;
      
      // If another save was requested while we were saving, process it now
      if (hasPendingSave) {
        // Small delay to avoid immediate retry
        setTimeout(() => handleSave(), 100);
      }
    }
  }

  // Conflict modal handlers
  async function handleConflictUseRemote() {
    if (conflictData.remoteData) {
      isLoadingRemoteData = true;
      
      let freshData = conflictData.remoteData;
      
      // Only retry fetching if we couldn't see the remote changes (due to cache)
      // If remoteChanges is populated, we already have fresh data
      if (conflictData.remoteChanges.length === 0) {
        // Re-fetch to ensure we have the freshest data (not cached)
        let previousSha = remoteSha;
        let attempts = 0;
        const maxAttempts = 5;
        
        showToast('Fetching latest data from server...', 'info');
        
        // Retry with delays to give cache time to clear (up to 32s total: 2s+4s+8s+16s)
        while (attempts < maxAttempts) {
          // Wait before retrying (exponential backoff: 2s, 4s, 8s, 16s, 32s)
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, attempts)));
          
          const retryResult = await fetchCurrentBoardData(octokit, githubConfig, usernameInput.toLowerCase());
          if (retryResult.success && retryResult.data && retryResult.sha) {
            // Always use the latest fetched data
            freshData = retryResult.data;
            remoteSha = retryResult.sha;
            
            // If we got a different SHA than before, we have fresh data
            if (retryResult.sha !== previousSha) {
              break;
            }
            previousSha = retryResult.sha;
          }
          attempts++;
        }
      }
      
      // Update SHA to remote version
      if (remoteSha) {
        fileSha = remoteSha;
      }
      
      // Merge loaded data with default columns structure
      const defaultColumns = getDefaultColumns();
      const mergedColumns = defaultColumns.map(defaultCol => {
        const loadedCol = freshData.columns.find(col => col.id === defaultCol.id);
        return {
          ...defaultCol,
          items: loadedCol?.items || []
        };
      });
      
      // Apply remote changes
      columns = mergedColumns;
      originalColumns = JSON.parse(JSON.stringify(mergedColumns));
      originalVersion = freshData.version || 0;
      version = freshData.version || 0;
      
      // Update other fields if present
      if (freshData.displayName !== undefined) {
        displayName = freshData.displayName;
      }
      if (freshData.uatEndDate !== undefined) {
        uatEndDate = freshData.uatEndDate;
      }
      if (freshData.devSiteUrl !== undefined) {
        devSiteUrl = freshData.devSiteUrl;
      }
      if (freshData.contactEmails !== undefined) {
        contactEmails = freshData.contactEmails;
      }
      if (freshData.disableAddTask !== undefined) {
        disableAddTask = freshData.disableAddTask;
      }
      
      // Clear conflict data
      conflictData = {
        hasConflict: false,
        localChanges: [],
        remoteChanges: []
      };
      remoteSha = undefined;
      
      isLoadingRemoteData = false;
      showToast('Loaded server version successfully', 'success');
    }
    
    // Close modal after state updates
    showConflictModal = false;
  }

  function handleConflictCancel() {
    // Clear conflict data
    conflictData = {
      hasConflict: false,
      localChanges: [],
      remoteChanges: []
    };
    remoteSha = undefined;
    showConflictModal = false;
  }

  // Toast functions
  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = toastId++;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
    }, 3000);
  }

  // Drag and drop handlers
  function handleDragStart(e: DragEvent, item: Task, columnId: ColumnId) {
    draggedItem = item;
    draggedFromColumn = columnId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  function handleDragOver(e: DragEvent, columnId: ColumnId) {
    e.preventDefault();
    dragOverColumn = columnId;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDragLeave() {
    dragOverColumn = null;
  }

  function handleDrop(e: DragEvent, targetColumnId: ColumnId) {
    e.preventDefault();
    dragOverColumn = null;

    if (!draggedItem || !draggedFromColumn) return;

    const sourceColumn = columns.find(c => c.id === draggedFromColumn);
    const targetColumn = columns.find(c => c.id === targetColumnId);

    if (!sourceColumn || !targetColumn) return;

    if (draggedFromColumn === targetColumnId) {
      draggedItem = null;
      draggedFromColumn = null;
      return;
    }

    sourceColumn.items = sourceColumn.items.filter(item => item.id !== draggedItem!.id);
    
    // Automatically lock task when moving out of To-Do column (once locked, stays locked)
    if (targetColumnId !== 'todo') {
      draggedItem.locked = true;
    }
    
    targetColumn.items = [...targetColumn.items, draggedItem];

    columns = [...columns];
    showToast(`Moved to ${targetColumn.title}`, 'success');

    draggedItem = null;
    draggedFromColumn = null;
    
    handleSave();
  }

  // Modal handlers
  function openNewItemModal() {
    isNewItem = true;
    selectedItem = null;
    selectedColumnId = 'todo';
    originalColumnId = null;
    isModalViewOnly = false;
    modalData = {
      description: '',
      device: 'All',
      feedback: [],
      section: '',
      images: []
    };
    originalModalData = { ...modalData };
    validationError = '';
    showModal = true;
  }

  function openModal(item: Task, columnId: ColumnId) {
    isNewItem = false;
    selectedItem = item;
    selectedColumnId = columnId;
    originalColumnId = columnId;
    // Set view-only mode if customer tries to view In Progress task
    isModalViewOnly = !isAdmin && columnId === 'inprogress' || columnId === 'cancelled';
    // Migrate old string feedback to array format (for backwards compatibility)
    let feedbackArray: FeedbackItem[];
    if (Array.isArray(item.feedback)) {
      // Migrate old 'admin' author values to 'pm' for backwards compatibility
      feedbackArray = item.feedback.map(fb => ({
        ...fb,
        author: (fb.author === 'admin' as any) ? 'pm' as const : fb.author
      }));
    } else if (typeof item.feedback === 'string' && (item.feedback as string).trim()) {
      // Legacy data migration from string to array
      feedbackArray = [{ text: item.feedback as string, author: 'pm' as const, createdAt: item.updatedAt }];
    } else {
      feedbackArray = [];
    }
    modalData = {
      description: item.description,
      type: item.type,
      device: item.device,
      feedback: feedbackArray,
      section: item.section || '',
      owner: item.owner,
      images: item.images || []
    };
    originalModalData = { ...modalData };
    validationError = '';
    showModal = true;
  }

  function toggleTaskLock(itemId: number) {
    // Find the task across all columns and toggle its locked status
    for (const column of columns) {
      const task = column.items.find(item => item.id === itemId);
      if (task) {
        task.locked = !task.locked;
        columns = [...columns]; // Trigger reactivity
        showToast(task.locked ? 'Task locked' : 'Task unlocked', 'success');
        handleSave();
        return;
      }
    }
  }

  function closeModal() {
    showModal = false;
    selectedItem = null;
    originalModalData = null;
  }

  function hasUnsavedChanges(): boolean {
    if (!originalModalData) return false;
    return JSON.stringify(modalData) !== JSON.stringify(originalModalData) ||
           selectedColumnId !== originalColumnId;
  }

  function attemptCloseModal() {
    if (!isModalViewOnly && hasUnsavedChanges()) {
      showUnsavedChanges = true;
    } else {
      closeModal();
    }
  }

  function discardChanges() {
    showUnsavedChanges = false;
    closeModal();
  }

  function saveAndClose() {
    showUnsavedChanges = false;
    saveModal();
  }

  function saveModal() {
    if (!modalData.description.trim()) {
      validationError = 'Description is required';
      return;
    }

    if (isAdmin && !modalData.type) {
      validationError = 'Type is required for admin';
      return;
    }

    if (isAdmin && !modalData.owner) {
      validationError = 'Owner is required for admin';
      return;
    }

    validationError = '';

    if (isNewItem) {
      const now = new Date().toISOString();
      const newItem: Task = {
        id: Date.now(),
        description: modalData.description.trim(),
        type: modalData.type,
        device: modalData.device,
        feedback: modalData.feedback,
        section: modalData.section.trim(),
        owner: modalData.owner,
        createdAt: now,
        updatedAt: now,
        locked: selectedColumnId !== 'todo',
        images: modalData.images || []
      };

      const targetColumn = columns.find(c => c.id === selectedColumnId);
      if (targetColumn) {
        targetColumn.items = [...targetColumn.items, newItem];
        columns = [...columns];
        showToast('Task added successfully', 'success');
        closeModal();
        handleSave();
        return;
      }
    } else if (selectedItem) {
      selectedItem.description = modalData.description.trim();
      selectedItem.type = modalData.type;
      selectedItem.device = modalData.device;
      selectedItem.feedback = modalData.feedback;
      selectedItem.section = modalData.section.trim();
      selectedItem.owner = modalData.owner;
      selectedItem.images = modalData.images || [];

      if (originalColumnId !== selectedColumnId) {
        const sourceColumn = columns.find(c => c.id === originalColumnId);
        const targetColumn = columns.find(c => c.id === selectedColumnId);

        if (sourceColumn && targetColumn) {
          // Automatically lock when moving out of To-Do (once locked, stays locked)
          if (selectedColumnId !== 'todo') {
            selectedItem.locked = true;
          }
          
          sourceColumn.items = sourceColumn.items.filter(item => item.id !== selectedItem!.id);
          targetColumn.items = [...targetColumn.items, selectedItem];
          columns = [...columns];
          showToast(`Updated and moved to ${targetColumn.title}`, 'success');
        }
      } else {
        columns = [...columns];
        showToast(`Updated "${modalData.description}"`, 'success');
      }
    }
    closeModal();
    handleSave();
  }

  function confirmDelete() {
    showDeleteConfirm = true;
  }

  async function executeDelete() {
    if (selectedItem && originalColumnId) {
      const column = columns.find(c => c.id === originalColumnId);
      if (column) {
        column.items = column.items.filter(item => item.id !== selectedItem!.id);
        columns = [...columns];
        showToast('Task deleted', 'info');
        
        // Save with skipMerge to prevent deleted task from being restored
        if (!isSaving) {
          isSaving = true;
          try {
            const boardData: BoardData = {
              displayName,
              uatEndDate,
              devSiteUrl,
              uatFolderUrl,
              contactEmails,
              passwordHash: storedPasswordHash,
              version,
              columns,
              disableAddTask
            };
            
            const id = usernameInput.toLowerCase();
            const result = await saveDataToGitHub(octokit, githubConfig, id, boardData, 'Delete task', fileSha);
            
            if (result.success) {
              if (result.sha) {
                fileSha = result.sha;
              }
              showToast('Changes saved', 'success');
            } else {
              showToast(result.error || 'Failed to save changes', 'error');
            }
          } finally {
            isSaving = false;
          }
        }
      }
    }
    showDeleteConfirm = false;
    closeModal();
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  function openHelpModal() {
    showHelpModal = true;
  }

  function closeHelpModal() {
    showHelpModal = false;
  }

  function getNotifyTeamMailto(): string {
    const subject = encodeURIComponent(`UAT Alert! - ${displayName} needs attention`);
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const uatUrl = `${baseUrl}#${usernameInput}`;
    const body = encodeURIComponent(`The UAT page for ${displayName} has sent an alert to the team.\n\nPlease check the UAT page as soon as possible:\n${uatUrl}\n\n`);
    return `mailto:${contactEmails}?subject=${subject}&body=${body}`;
  }
</script>

<nav class="navbar">
  <div class="nav-left">
    <a class="nav-logo" href="/">
      <svg id="V2" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 880 234.6">
        <defs>
          <style>
            .cls-1 { fill: #c9f5d6; }
            .cls-2 { fill: url(#linear-gradient); }
            .cls-3 { fill: var(--fg-2, #6b7280); }
            .cls-4 { isolation: isolate; }
            .cls-5 { fill: #fff; }
            .cls-6 { fill: #6c9; }
            .cls-7 { fill: var(--fg-1, #061419); }
          </style>
          <linearGradient id="linear-gradient" x1="93.4" y1="-44" x2="90.5" y2="-49.1" gradientTransform="translate(-5032.2 2724) scale(56)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#6c9"/>
            <stop offset="1" stop-color="#3cb7ff"/>
          </linearGradient>
        </defs>
        <g id="logo">
          <g id="icon">
            <rect class="cls-2" width="234.6" height="234.6" rx="58.6" ry="58.6"/>
            <g>
              <path class="cls-5" d="M108.8,140.5c5.5-3.3,11.5-3.5,15.9.6l-11-18c12.6-6.3,25.1-18.8,25.1-37.7s-18.8-44-44-44h-50.2v138.2h25.1v-50.2h15.7l15.7,24.9c-1.1-5.7,2.4-10.6,7.6-13.7h0ZM69.8,104.2v-37.7h25.1c12.6,0,18.8,6.3,18.8,18.8s-6.3,18.8-18.8,18.8h-25.1,0Z"/>
              <path class="cls-1" d="M134,195.3c-.2,0-.4,0-.6,0-4.2-.2-8-2.5-10.1-6.1l-16.3-27.3c-3.6-6-1.6-13.7,4.3-17.2,6-3.6,13.7-1.6,17.2,4.3l6.7,11.2,46.3-62.3c4.1-5.6,12-6.7,17.6-2.6,5.6,4.1,6.7,12,2.6,17.6l-57.5,77.3c-2.4,3.2-6.1,5.1-10.1,5.1h0Z"/>
            </g>
          </g>
          <g id="text">
            <g class="cls-4">
              <g class="cls-4">
                <path class="cls-7" d="M288.8,112.7V41.4h30.3c7.6,0,13.2.6,16.6,1.9s6.2,3.6,8.3,6.8,3.1,7,3.1,11.2-1.6,9.8-4.7,13.3-7.9,5.7-14.1,6.6c3.1,1.8,5.7,3.8,7.7,6s4.8,6,8.2,11.6l8.7,13.9h-17.2l-10.4-15.5c-3.7-5.5-6.2-9-7.6-10.5s-2.8-2.4-4.3-3-3.9-.8-7.2-.8h-2.9v29.8h-14.4ZM303.2,71.6h10.7c6.9,0,11.2-.3,12.9-.9s3.1-1.6,4-3,1.5-3.2,1.5-5.4-.6-4.3-1.9-5.8-3.1-2.4-5.4-2.8c-1.2-.2-4.7-.2-10.5-.2h-11.2v18.1h0Z"/>
                <path class="cls-7" d="M390.5,96.3l13.6,2.3c-1.8,5-4.5,8.8-8.3,11.4s-8.5,3.9-14.2,3.9c-9,0-15.6-2.9-19.9-8.8-3.4-4.7-5.1-10.6-5.1-17.8s2.2-15.3,6.7-20.1,10.1-7.3,17-7.3,13.8,2.5,18.2,7.6,6.6,12.9,6.4,23.3h-34.3c0,4.1,1.2,7.2,3.3,9.5s4.7,3.4,7.9,3.4,3.9-.6,5.4-1.8,2.6-3.1,3.3-5.6h0ZM391.3,82.5c0-4-1.1-7-3.1-9s-4.3-3.1-7.1-3.1-5.4,1.1-7.4,3.3-2.9,5.1-2.9,8.9h20.4Z"/>
                <path class="cls-7" d="M430.2,112.7l-20.8-51.7h14.4l9.7,26.4,2.8,8.8c.7-2.2,1.2-3.7,1.4-4.4.5-1.5.9-2.9,1.5-4.4l9.8-26.4h14.1l-20.5,51.7h-12.3Z"/>
                <path class="cls-7" d="M471.4,54.1v-12.6h13.7v12.6h-13.7ZM471.4,112.7v-51.7h13.7v51.7h-13.7Z"/>
                <path class="cls-7" d="M529,96.3l13.6,2.3c-1.8,5-4.5,8.8-8.3,11.4s-8.5,3.9-14.2,3.9c-9,0-15.6-2.9-19.9-8.8-3.4-4.7-5.1-10.6-5.1-17.8s2.2-15.3,6.7-20.1c4.5-4.9,10.1-7.3,17-7.3s13.8,2.5,18.2,7.6,6.6,12.9,6.4,23.3h-34.3c0,4.1,1.2,7.2,3.3,9.5s4.7,3.4,7.9,3.4,3.9-.6,5.4-1.8,2.6-3.1,3.3-5.6h0ZM529.8,82.5c0-4-1.1-7-3.1-9s-4.3-3.1-7.1-3.1-5.4,1.1-7.4,3.3-2.9,5.1-2.9,8.9h20.4Z"/>
                <path class="cls-7" d="M564.2,112.7l-16.3-51.7h13.3l9.7,33.9,8.9-33.9h13.2l8.6,33.9,9.9-33.9h13.5l-16.6,51.7h-13.1l-8.9-33.2-8.8,33.2h-13.3Z"/>
              </g>
              <g class="cls-4">
                <path class="cls-6" d="M691.4,112.7h-15.7l-6.2-16.2h-28.5l-5.9,16.2h-15.3l27.8-71.3h15.2l28.6,71.3h0ZM664.9,84.5l-9.8-26.5-9.6,26.5h19.5Z"/>
                <path class="cls-6" d="M707.7,112.7v-59.3h-21.2v-12.1h56.7v12.1h-21.1v59.3h-14.4Z"/>
              </g>
            </g>
            <g class="cls-4">
              <path class="cls-3" d="M311.5,143.3h5.2v22.7c0,3.9-.4,7.1-1.3,9.4-.9,2.3-2.5,4.2-4.8,5.7-2.3,1.5-5.4,2.2-9.2,2.2s-6.7-.6-9-1.9-4-3.1-5-5.5-1.5-5.7-1.5-9.8v-22.7h5.2v22.6c0,3.4.3,5.9,1,7.5.6,1.6,1.7,2.9,3.3,3.7,1.5.9,3.4,1.3,5.7,1.3,3.8,0,6.5-.9,8.2-2.6,1.6-1.7,2.4-5.1,2.4-10v-22.6h0Z"/>
              <path class="cls-3" d="M322.8,174l4.8-.7c.3,1.9,1,3.4,2.2,4.4,1.2,1,2.9,1.5,5.1,1.5s3.9-.5,4.9-1.4,1.6-2,1.6-3.2-.5-1.9-1.4-2.6c-.7-.4-2.3-1-4.9-1.6-3.5-.9-6-1.7-7.3-2.3-1.4-.7-2.4-1.6-3.1-2.7-.7-1.2-1.1-2.4-1.1-3.8s.3-2.4.9-3.5c.6-1.1,1.4-2,2.4-2.7.7-.6,1.8-1,3.1-1.4,1.3-.4,2.7-.6,4.2-.6,2.2,0,4.2.3,5.9,1,1.7.6,2.9,1.5,3.7,2.6.8,1.1,1.4,2.6,1.7,4.4l-4.7.6c-.2-1.5-.8-2.6-1.9-3.4-1-.8-2.5-1.2-4.3-1.2s-3.8.4-4.7,1.1c-.9.7-1.4,1.6-1.4,2.6s.2,1.2.6,1.7c.4.5,1,.9,1.8,1.3.5.2,1.9.6,4.3,1.2,3.4.9,5.8,1.7,7.1,2.2,1.3.6,2.4,1.4,3.2,2.5s1.2,2.5,1.2,4.1-.5,3.1-1.4,4.5c-.9,1.4-2.3,2.5-4.1,3.3-1.8.8-3.8,1.2-6,1.2-3.7,0-6.5-.8-8.4-2.3-1.9-1.5-3.2-3.8-3.7-6.8h0Z"/>
              <path class="cls-3" d="M371.5,173.3l5,.6c-.8,2.9-2.2,5.2-4.4,6.8s-4.8,2.4-8.1,2.4-7.5-1.3-9.9-3.8c-2.4-2.6-3.7-6.1-3.7-10.8s1.2-8.5,3.7-11.1,5.7-4,9.6-4,6.9,1.3,9.3,3.9c2.4,2.6,3.6,6.2,3.6,10.9s0,.7,0,1.3h-21.2c.2,3.1,1.1,5.5,2.6,7.2,1.6,1.7,3.6,2.5,5.9,2.5s3.3-.5,4.5-1.4,2.2-2.4,3-4.4h0ZM355.7,165.5h15.9c-.2-2.4-.8-4.2-1.8-5.4-1.5-1.9-3.5-2.8-6-2.8s-4.1.7-5.6,2.2c-1.5,1.5-2.3,3.5-2.5,5.9h0Z"/>
              <path class="cls-3" d="M382.5,182.5v-28.4h4.3v4.3c1.1-2,2.1-3.3,3.1-4,.9-.6,2-1,3.1-1,1.6,0,3.3.5,5,1.6l-1.7,4.5c-1.2-.7-2.4-1-3.5-1s-2,.3-2.8.9-1.4,1.5-1.8,2.6c-.5,1.7-.8,3.6-.8,5.6v14.9h-4.8,0Z"/>
              <path class="cls-3" d="M409.3,182.5l15.1-39.2h5.6l16.1,39.2h-5.9l-4.6-11.9h-16.4l-4.3,11.9h-5.5,0ZM420.6,166.4h13.3l-4.1-10.9c-1.2-3.3-2.2-6-2.8-8.1-.5,2.5-1.2,5-2.1,7.5l-4.3,11.5h0Z"/>
              <path class="cls-3" d="M468.1,172.1l4.7.6c-.5,3.3-1.8,5.8-4,7.7-2.1,1.8-4.8,2.8-7.9,2.8s-7-1.3-9.4-3.8c-2.4-2.5-3.5-6.2-3.5-10.9s.5-5.8,1.5-8.1,2.6-4,4.6-5.2c2.1-1.2,4.3-1.7,6.8-1.7s5.6.8,7.6,2.3,3.2,3.8,3.8,6.7l-4.7.7c-.4-1.9-1.2-3.3-2.4-4.3-1.1-1-2.5-1.4-4.1-1.4-2.4,0-4.4.9-5.9,2.6-1.5,1.7-2.3,4.5-2.3,8.3s.7,6.6,2.2,8.3c1.5,1.7,3.4,2.6,5.7,2.6s3.5-.6,4.7-1.7c1.3-1.2,2.1-2.9,2.4-5.4h0Z"/>
              <path class="cls-3" d="M495.5,172.1l4.7.6c-.5,3.3-1.8,5.8-4,7.7-2.1,1.8-4.8,2.8-7.9,2.8s-7-1.3-9.4-3.8c-2.4-2.5-3.5-6.2-3.5-10.9s.5-5.8,1.5-8.1,2.6-4,4.6-5.2c2.1-1.2,4.3-1.7,6.8-1.7s5.6.8,7.6,2.3,3.2,3.8,3.8,6.7l-4.7.7c-.4-1.9-1.2-3.3-2.4-4.3-1.1-1-2.5-1.4-4.1-1.4-2.4,0-4.4.9-5.9,2.6-1.5,1.7-2.3,4.5-2.3,8.3s.7,6.6,2.2,8.3c1.5,1.7,3.4,2.6,5.7,2.6s3.5-.6,4.7-1.7c1.3-1.2,2.1-2.9,2.4-5.4h0Z"/>
              <path class="cls-3" d="M523.8,173.3l5,.6c-.8,2.9-2.2,5.2-4.4,6.8s-4.8,2.4-8.1,2.4-7.5-1.3-9.9-3.8c-2.4-2.6-3.7-6.1-3.7-10.8s1.2-8.5,3.7-11.1,5.7-4,9.6-4,6.9,1.3,9.3,3.9c2.4,2.6,3.6,6.2,3.6,10.9s0,.7,0,1.3h-21.2c.2,3.1,1.1,5.5,2.6,7.2,1.6,1.7,3.6,2.5,5.9,2.5s3.3-.5,4.5-1.4,2.2-2.4,3-4.4h0ZM508,165.5h15.9c-.2-2.4-.8-4.2-1.8-5.4-1.5-1.9-3.5-2.8-6-2.8s-4.1.7-5.6,2.2c-1.5,1.5-2.3,3.5-2.5,5.9h0Z"/>
              <path class="cls-3" d="M534.9,193.4v-39.3h4.4v3.7c1-1.4,2.2-2.5,3.5-3.2,1.3-.7,2.9-1.1,4.7-1.1s4.6.6,6.4,1.9,3.3,3,4.2,5.3c.9,2.3,1.4,4.8,1.4,7.5s-.5,5.5-1.6,7.9c-1,2.3-2.6,4.1-4.5,5.4-2,1.2-4.1,1.9-6.3,1.9s-3-.3-4.3-1c-1.3-.7-2.3-1.5-3.1-2.6v13.8h-4.8,0ZM539.2,168.4c0,3.7.7,6.4,2.2,8.1s3.3,2.6,5.4,2.6,4-.9,5.5-2.7c1.5-1.8,2.3-4.6,2.3-8.4s-.7-6.3-2.2-8.1c-1.5-1.8-3.3-2.7-5.3-2.7s-3.9,1-5.4,2.9c-1.6,1.9-2.4,4.7-2.4,8.4h0Z"/>
              <path class="cls-3" d="M575.9,178.2l.7,4.3c-1.4.3-2.6.4-3.6.4-1.7,0-3.1-.3-4.1-.8-1-.5-1.6-1.3-2-2.2s-.6-2.8-.6-5.7v-16.4h-3.5v-3.7h3.5v-7l4.8-2.9v9.9h4.8v3.7h-4.8v16.6c0,1.4,0,2.3.3,2.7s.4.7.8.9c.4.2.9.3,1.6.3s1.2,0,2.1-.2h0Z"/>
              <path class="cls-3" d="M599.1,179c-1.8,1.5-3.5,2.6-5.2,3.2-1.6.6-3.4.9-5.3.9-3.1,0-5.5-.8-7.2-2.3-1.7-1.5-2.5-3.5-2.5-5.8s.3-2.7,1-3.8c.6-1.1,1.5-2.1,2.5-2.8,1-.7,2.2-1.2,3.5-1.6.9-.2,2.4-.5,4.3-.7,3.9-.5,6.8-1,8.6-1.7,0-.7,0-1.1,0-1.3,0-2-.5-3.3-1.4-4.1-1.2-1.1-3.1-1.6-5.5-1.6s-3.9.4-5,1.2c-1.1.8-1.9,2.2-2.4,4.2l-4.7-.6c.4-2,1.1-3.6,2.1-4.9,1-1.2,2.4-2.2,4.3-2.9,1.9-.7,4-1,6.5-1s4.4.3,5.9.9,2.6,1.3,3.3,2.2c.7.9,1.2,2,1.5,3.3.2.8.2,2.3.2,4.4v6.4c0,4.5.1,7.3.3,8.5.2,1.2.6,2.3,1.2,3.4h-5c-.5-1-.8-2.2-1-3.5h0ZM598.7,168.2c-1.7.7-4.4,1.3-7.9,1.8-2,.3-3.4.6-4.2,1-.8.4-1.4.9-1.9,1.6s-.7,1.4-.7,2.3c0,1.3.5,2.4,1.5,3.2s2.4,1.3,4.3,1.3,3.5-.4,4.9-1.2,2.5-1.9,3.2-3.3c.5-1.1.8-2.7.8-4.8v-1.8h0Z"/>
              <path class="cls-3" d="M611,182.5v-28.4h4.3v4c2.1-3.1,5.1-4.7,9-4.7s3.3.3,4.7.9c1.4.6,2.5,1.4,3.2,2.4.7,1,1.2,2.2,1.5,3.6.2.9.3,2.5.3,4.7v17.5h-4.8v-17.3c0-2-.2-3.4-.6-4.4-.4-1-1-1.7-2-2.3s-2.1-.9-3.4-.9c-2.1,0-3.8.7-5.3,2-1.5,1.3-2.2,3.8-2.2,7.4v15.5h-4.8,0Z"/>
              <path class="cls-3" d="M660.1,172.1l4.7.6c-.5,3.3-1.8,5.8-4,7.7-2.1,1.8-4.8,2.8-7.9,2.8s-7-1.3-9.4-3.8c-2.4-2.5-3.6-6.2-3.6-10.9s.5-5.8,1.5-8.1,2.6-4,4.6-5.2c2.1-1.2,4.3-1.7,6.8-1.7s5.6.8,7.6,2.3,3.2,3.8,3.8,6.7l-4.7.7c-.4-1.9-1.2-3.3-2.4-4.3-1.1-1-2.5-1.4-4.1-1.4-2.4,0-4.4.9-5.9,2.6-1.5,1.7-2.3,4.5-2.3,8.3s.7,6.6,2.2,8.3c1.5,1.7,3.4,2.6,5.7,2.6s3.5-.6,4.7-1.7c1.3-1.2,2.1-2.9,2.4-5.4h0Z"/>
              <path class="cls-3" d="M688.4,173.3l5,.6c-.8,2.9-2.2,5.2-4.4,6.8s-4.8,2.4-8.1,2.4-7.5-1.3-9.9-3.8-3.7-6.1-3.7-10.8,1.2-8.5,3.7-11.1,5.7-4,9.6-4,6.9,1.3,9.3,3.9c2.4,2.6,3.6,6.2,3.6,10.9s0,.7,0,1.3h-21.2c.2,3.1,1.1,5.5,2.6,7.2,1.6,1.7,3.6,2.5,5.9,2.5s3.3-.5,4.5-1.4,2.2-2.4,3-4.4h0ZM672.6,165.5h15.9c-.2-2.4-.8-4.2-1.8-5.4-1.5-1.9-3.5-2.8-6-2.8s-4.1.7-5.6,2.2c-1.5,1.5-2.3,3.5-2.5,5.9h0Z"/>
              <path class="cls-3" d="M724.2,182.5v-34.6h-12.9v-4.6h31.1v4.6h-13v34.6h-5.2Z"/>
              <path class="cls-3" d="M760.5,173.3l5,.6c-.8,2.9-2.2,5.2-4.4,6.8-2.1,1.6-4.8,2.4-8.1,2.4s-7.4-1.3-9.9-3.8c-2.4-2.6-3.6-6.1-3.6-10.8s1.2-8.5,3.7-11.1,5.7-4,9.6-4,6.9,1.3,9.3,3.9c2.4,2.6,3.6,6.2,3.6,10.9s0,.7,0,1.3h-21.2c.2,3.1,1.1,5.5,2.7,7.2,1.6,1.7,3.6,2.5,5.9,2.5s3.3-.5,4.5-1.4c1.2-.9,2.2-2.4,3-4.4h0ZM744.7,165.5h15.9c-.2-2.4-.8-4.2-1.8-5.4-1.5-1.9-3.5-2.8-6-2.8s-4.1.7-5.6,2.2c-1.5,1.5-2.3,3.5-2.5,5.9h0Z"/>
              <path class="cls-3" d="M769.6,174l4.8-.7c.3,1.9,1,3.4,2.2,4.4,1.2,1,2.9,1.5,5.1,1.5s3.9-.5,4.9-1.4,1.6-2,1.6-3.2-.5-1.9-1.4-2.6c-.7-.4-2.3-1-4.9-1.6-3.5-.9-6-1.7-7.3-2.3s-2.4-1.6-3.1-2.7c-.7-1.2-1.1-2.4-1.1-3.8s.3-2.4.9-3.5c.6-1.1,1.4-2,2.4-2.7.7-.6,1.8-1,3.1-1.4s2.7-.6,4.2-.6c2.2,0,4.2.3,5.9,1,1.7.6,2.9,1.5,3.7,2.6.8,1.1,1.4,2.6,1.7,4.4l-4.7.6c-.2-1.5-.8-2.6-1.9-3.4-1-.8-2.5-1.2-4.3-1.2s-3.8.4-4.7,1.1c-.9.7-1.4,1.6-1.4,2.6s.2,1.2.6,1.7c.4.5,1,.9,1.8,1.3.5.2,1.9.6,4.3,1.2,3.4.9,5.8,1.7,7.1,2.2,1.4.6,2.4,1.4,3.2,2.5.8,1.1,1.2,2.5,1.2,4.1s-.5,3.1-1.4,4.5c-.9,1.4-2.3,2.5-4.1,3.3-1.8.8-3.8,1.2-6,1.2-3.7,0-6.5-.8-8.4-2.3s-3.2-3.8-3.7-6.8h0Z"/>
              <path class="cls-3" d="M809.4,178.2l.7,4.3c-1.4.3-2.6.4-3.6.4-1.7,0-3.1-.3-4.1-.8-1-.5-1.6-1.3-2-2.2-.4-.9-.6-2.8-.6-5.7v-16.4h-3.5v-3.7h3.5v-7l4.8-2.9v9.9h4.8v3.7h-4.8v16.6c0,1.4,0,2.3.3,2.7.2.4.4.7.8.9.4.2.9.3,1.6.3s1.2,0,2.1-.2h0Z"/>
              <path class="cls-3" d="M814.2,148.8v-5.5h4.8v5.5h-4.8ZM814.2,182.5v-28.4h4.8v28.4h-4.8Z"/>
              <path class="cls-3" d="M826.3,182.5v-28.4h4.3v4c2.1-3.1,5.1-4.7,9-4.7s3.3.3,4.7.9c1.4.6,2.5,1.4,3.2,2.4.7,1,1.2,2.2,1.5,3.6.2.9.3,2.5.3,4.7v17.5h-4.8v-17.3c0-2-.2-3.4-.6-4.4s-1-1.7-2-2.3c-1-.6-2.1-.9-3.4-.9-2,0-3.8.7-5.3,2-1.5,1.3-2.2,3.8-2.2,7.4v15.5h-4.8,0Z"/>
              <path class="cls-3" d="M855.9,184.8l4.7.7c.2,1.4.7,2.5,1.6,3.2,1.2.9,2.8,1.3,4.9,1.3s4-.4,5.2-1.3,2-2.1,2.5-3.7c.2-1,.4-3,.3-6.2-2.1,2.5-4.7,3.7-7.9,3.7s-6.9-1.4-9.1-4.2-3.2-6.2-3.2-10.1.5-5.2,1.5-7.5c1-2.3,2.4-4.1,4.3-5.3s4.1-1.9,6.6-1.9,6.1,1.4,8.3,4.1v-3.4h4.4v24.6c0,4.4-.5,7.6-1.4,9.4-.9,1.8-2.3,3.3-4.3,4.4-2,1.1-4.4,1.6-7.2,1.6s-6.1-.8-8.2-2.3c-2.1-1.5-3.1-3.8-3-6.9h0ZM859.9,167.8c0,3.7.7,6.4,2.2,8.2s3.3,2.6,5.6,2.6,4.1-.9,5.6-2.6,2.2-4.4,2.2-8-.8-6.1-2.3-7.9-3.4-2.7-5.6-2.7-4,.9-5.5,2.6c-1.5,1.7-2.2,4.3-2.2,7.7Z"/>
            </g>
          </g>
        </g>
      </svg>
    </a>
  </div>
  <div class="nav-right">
    {#if isAdminAuthenticated && !isAdminRoute}
      <ButtonComponent
        element="button"
        text="Accounts"
        onClick={() => goToAccount('/admin')}
        type="hollow"
      />
    {/if}
    {#if !isAdminAuthenticated && !isAdminRoute && !customerRoute && (viewMode === 'customerLogin' || viewMode === 'landing')}
      <ButtonComponent
        element="button"
        text="Admin Login"
        onClick={showAdminLogin}
        type="hollow-primary"
      />
    {/if}
    {#if isAuthenticated && !customerRoute && !isAdminRoute}
      <ButtonComponent
        element="button"
        text="Account"
        onClick={() => goToAccount(`/${usernameInput}`)}
        type="hollow"
      />
    {/if}
    {#if !isAuthenticated && !isAdminAuthenticated && !isAdminRoute && !customerRoute && viewMode === 'landing'}
      <ButtonComponent
        element="button"
        text="Login"
        onClick={showCustomerLogin}
        type="primary"
      />
    {/if}
    {#if isAuthenticated && contactEmails}
      <ButtonComponent
        text="Notify Team"
        href={getNotifyTeamMailto()}
        type="hollow"
      />
    {/if}
    {#if isAuthenticated && devSiteUrl}
      <ButtonComponent
        text="Open Review Link"
        href={devSiteUrl.startsWith('http') ? devSiteUrl : `https://${devSiteUrl}`}
        type="hollow"
        target="_blank"
        rel="nofollow noopener"
      />
    {/if}
    {#if isAuthenticated || isAdminAuthenticated}
      <ButtonComponent
        element="button"
        text="Logout"
        onClick={logout}
        type="cancel"
      />
    {/if}
  </div>
</nav>

{#if isAdminMode}
  <AdminList
    customers={adminCustomers}
    {isLoading}
    bind:isAuthenticated={isAdminAuthenticated}
    bind:passwordInput={adminPasswordInput}
    bind:passwordError={adminPasswordError}
    onPasswordSubmit={handleAdminPasswordSubmit}
    onSelectCustomer={handleAdminSelectCustomer}
    onCreateCustomer={handleAdminCreateCustomer}
    onDeleteCustomer={handleAdminDeleteCustomer}
  />
{:else if !isAdminRoute && !customerRoute && viewMode === 'landing'}
  <Landing />
{:else if !isAuthenticated}
  <Login
    bind:usernameInput
    bind:passwordInput
    bind:passwordError
    bind:isLoading
    onSubmit={handlePasswordSubmit}
    onForgotPassword={() => showToast('You cannot reset your password here. Please reach out and we will provide you with your password.', 'info')}
    onAdminLogin={!isAdminRoute && !customerRoute && viewMode === 'customerLogin' ? showAdminLogin : undefined}
  />
{:else}
  <Board
    displayName={displayName}
    uatEndDate={uatEndDate}
    devSiteUrl={devSiteUrl}
    uatFolderUrl={uatFolderUrl}
    contactEmails={contactEmails}
    customerId={usernameInput}
    {columns}
    {isAdmin}
    {isAdminAuthenticated}
    bind:searchQuery
    bind:filterType
    bind:filterOwner
    bind:draggedItem
    bind:dragOverColumn
    bind:disableAddTask
    onAddTask={openNewItemModal}
    onHelp={openHelpModal}
    onToggleAdminView={toggleAdminView}
    onItemDragStart={handleDragStart}
    onItemClick={openModal}
    onToggleLock={toggleTaskLock}
    onDrop={handleDrop}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onUpdateAccountInfo={handleUpdateAccountInfo}
    onSave={handleSave}
  />

  <TaskModal
    show={showModal}
    isNew={isNewItem}
    isViewOnly={isModalViewOnly}
    isLocked={selectedItem?.locked || false}
    bind:modalData
    bind:selectedColumnId
    {columns}
    {isAdmin}
    {displayName}
    {validationError}
    onSave={saveModal}
    onDelete={confirmDelete}
    onCancel={attemptCloseModal}
  />

  <ConfirmModal
    show={showDeleteConfirm}
    type="delete"
    onConfirm={executeDelete}
    onCancel={cancelDelete}
  />

  <ConfirmModal
    show={showUnsavedChanges}
    type="unsaved"
    onCancel={() => showUnsavedChanges = false}
    onDiscard={discardChanges}
    onSave={saveAndClose}
  />

  <HelpModal
    show={showHelpModal}
    {disableAddTask}
    onClose={closeHelpModal}
  />

  <ConflictModal
    show={showConflictModal}
    {conflictData}
    loading={isLoadingRemoteData}
    onUseRemote={handleConflictUseRemote}
    onCancel={handleConflictCancel}
  />
{/if}

<ToastComponent bind:toasts />

<style>
  .navbar {
    color: var(--fg-1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    min-height: 75px;
    background: var(--bg-2);
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 0 1 auto;
  }

  .nav-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
    flex: 1;
  }

  .nav-logo {
    width: auto;
    height: 54px;
    display: flex;
  }

  @media (max-width: 768px) {
    .navbar {
      flex-wrap: wrap;
      padding: 1rem;
      min-height: auto;
    }

    .nav-left {
      width: 100%;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .nav-right {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
    }

    .nav-logo {
      width: 150px;
    }
  }
</style>
