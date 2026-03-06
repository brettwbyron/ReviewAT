<script lang="ts">
  import type { Column, Task, TaskType, OwnerType, ColumnId } from '$lib/types';
  import SearchFilters from './SearchFilters.svelte';
  import ColumnComponent from './Column.svelte';
  import ButtonComponent from './Button.svelte';

  let {
    displayName,
    uatEndDate,
    devSiteUrl,
    uatFolderUrl,
    contactEmails,
    customerId,
    columns,
    isAdmin,
    isAdminAuthenticated = false,
    searchQuery = $bindable<string>(''),
    filterType = $bindable<TaskType | 'All'>('All'),
    filterOwner = $bindable<OwnerType | 'All'>('All'),
    draggedItem = $bindable<Task | null>(null),
    dragOverColumn = $bindable<ColumnId | null>(null),
    disableAddTask = $bindable(false),
    onAddTask,
    onHelp,
    onToggleAdminView,
    onItemDragStart,
    onItemClick,
    onToggleLock,
    onDrop,
    onDragOver,
    onDragLeave,
    onUpdateAccountInfo,
    onSave
  }: {
    displayName: string;
    uatEndDate: string;
    devSiteUrl: string;
    uatFolderUrl: string;
    contactEmails: string;
    customerId: string;
    columns: Column[];
    isAdmin: boolean;
    isAdminAuthenticated?: boolean;
    searchQuery: string;
    filterType: TaskType | 'All';
    filterOwner: OwnerType | 'All';
    draggedItem: Task | null;
    dragOverColumn: ColumnId | null;
    disableAddTask: boolean;
    onAddTask: () => void;
    onHelp: () => void;
    onToggleAdminView?: () => void;
    onItemDragStart: (e: DragEvent, item: Task, columnId: ColumnId) => void;
    onItemClick: (item: Task, columnId: ColumnId) => void;
    onToggleLock: (itemId: number) => void;
    onDrop: (e: DragEvent, columnId: ColumnId) => void;
    onDragOver: (e: DragEvent, columnId: ColumnId) => void;
    onDragLeave: () => void;
    onUpdateAccountInfo?: (displayName: string, uatEndDate: string, devSiteUrl: string, uatFolderUrl: string, contactEmails: string, password: string) => void;
    onSave?: () => void;
  } = $props();

  let filteredColumns = $derived(getFilteredColumns());
  
  let isEditingAccountInfo = $state(false);
  let editDisplayName = $state('');
  let editUatEndDate = $state('');
  let editDevSiteUrl = $state('');
  let editUatFolderUrl = $state('');
  let editContactEmails = $state('');
  let editPassword = $state('');
  
  let daysRemaining = $derived.by(() => {
    if (!uatEndDate) return null;
    // Parse as local date to avoid timezone issues
    const dateStr = uatEndDate.split('T')[0]; // Get just YYYY-MM-DD part
    const [year, month, day] = dateStr.split('-').map(Number);
    const endDate = new Date(year, month - 1, day); // month is 0-indexed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  });
  
  let isUatExpired = $derived(daysRemaining !== null && daysRemaining <= 0);
  let isUatEndingSoon = $derived(daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0);
  
  // Effective disable state: true if admin toggled it OR if UAT has expired
  let effectiveDisableAddTask = $derived(disableAddTask || isUatExpired);

  function getFilteredColumns(): Column[] {
    const filtered = columns.map(column => ({
      ...column,
      items: column.items.filter(item => {
        const matchesSearch = item.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'All' || item.type === filterType;
        const matchesOwner = filterOwner === 'All' || item.owner === filterOwner;
        return matchesSearch && matchesType && matchesOwner;
      })
    }));
    
    // Hide empty admin-restricted columns for non-admin users
    if (!isAdmin) {
      const adminRestrictedColumns: ColumnId[] = ['feedback', 'inprogress', 'retest', 'cancelled'];
      return filtered.filter(column => {
        if (adminRestrictedColumns.includes(column.id)) {
          return column.items.length > 0;
        }
        return true;
      });
    }
    
    return filtered;
  }
  
  // Separate feedback, re-test, in progress, and cancelled columns from main columns
  let feedbackColumn = $derived(filteredColumns.find(col => col.id === 'feedback'));
  let retestColumn = $derived(filteredColumns.find(col => col.id === 'retest'));
  let inProgressColumn = $derived(filteredColumns.find(col => col.id === 'inprogress'));
  let cancelledColumn = $derived(filteredColumns.find(col => col.id === 'cancelled'));
  let mainColumns = $derived(filteredColumns.filter(col => col.id !== 'feedback' && col.id !== 'retest' && col.id !== 'inprogress' && col.id !== 'cancelled'));
  
  // Get variant for each column
  function getColumnVariant(columnId: ColumnId): 'default' | 'alert' | 'warning' | 'info' | 'success' | 'subtle' {
    if (columnId === 'feedback') return 'warning';
    if (columnId === 'retest') return 'alert';
    if (columnId === 'todo') return 'info';
    if (columnId === 'approved') return 'success';
    if (columnId === 'inprogress' || columnId === 'cancelled') return 'subtle';
    return 'default';
  }
  
  function startEditingAccountInfo() {
    editDisplayName = displayName;
    // Extract just the YYYY-MM-DD part
    editUatEndDate = uatEndDate ? uatEndDate.split('T')[0] : '';
    editDevSiteUrl = devSiteUrl;
    editUatFolderUrl = uatFolderUrl;
    editContactEmails = contactEmails;
    editPassword = ''; // Always start empty for security
    isEditingAccountInfo = true;
  }
  
  function cancelEditingAccountInfo() {
    isEditingAccountInfo = false;
    editPassword = ''; // Clear password for security
  }
  
  function saveAccountInfo() {
    if (onUpdateAccountInfo) {
      // Store as YYYY-MM-DD format (no time component to avoid timezone issues)
      onUpdateAccountInfo(editDisplayName, editUatEndDate, editDevSiteUrl, editUatFolderUrl, editContactEmails, editPassword);
    }
    isEditingAccountInfo = false;
    editPassword = ''; // Clear password for security
  }
</script>

<div class="container">
  <div class="account-info">
    {#if isEditingAccountInfo && isAdmin}
      <div class="edit-account-form">
        <div class="form-group">
          <label for="edit-display-name">Display Name</label>
          <input
            id="edit-display-name"
            type="text"
            bind:value={editDisplayName}
            placeholder="Account Display Name"
          />
        </div>
        
        <div class="form-group">
          <label for="edit-uat-date">UAT Review Deadline</label>
          <input
            id="edit-uat-date"
            type="date"
            bind:value={editUatEndDate}
          />
        </div>
        
        <div class="form-group">
          <label for="edit-dev-url">Dev URL</label>
          <input
            id="edit-dev-url"
            type="text"
            bind:value={editDevSiteUrl}
            placeholder="https://linkto.reviewpage.com"
          />
        </div>
        
        <div class="form-group">
          <label for="edit-uat-folder-url">UAT Folder URL (Optional. Used for uploading assets)</label>
          <input
            id="edit-uat-folder-url"
            type="text"
            bind:value={editUatFolderUrl}
            placeholder="https://drive.google.com/..."
          />
        </div>
        
        <div class="form-group">
          <label for="edit-contact-emails">Contact Emails (Optional. Used for email alerts)</label>
          <input
            id="edit-contact-emails"
            type="text"
            bind:value={editContactEmails}
            placeholder="email1@example.com, email2@example.com"
          />
        </div>
        
        <div class="form-group">
          <label for="edit-password">New Password (leave blank to keep current)</label>
          <input
            id="edit-password"
            type="password"
            bind:value={editPassword}
            placeholder="Enter new password"
            autocomplete="new-password"
          />
        </div>
        
        <div class="form-actions">
          <ButtonComponent 
            element="button"
            text="Cancel"
            type="cancel"
            onClick={cancelEditingAccountInfo}
          />
          <ButtonComponent 
            element="button"
            text="Save"
            type="save"
            onClick={saveAccountInfo}
          />
        </div>
      </div>
    {:else}
      <div class="header-container">
        <h1>{displayName || customerId}</h1>
        {#if uatEndDate}
          <div class="uat-info-section">
            <div class="uat-date-container">
              <span class="uat-end-date" class:warning={isUatEndingSoon} class:error={isUatExpired}>
              {#if isUatExpired}
                UAT review is over. Fixing in progress.
              {:else}
                UAT Review Deadline: {(() => {
                  const dateStr = uatEndDate.split('T')[0];
                  const [year, month, day] = dateStr.split('-').map(Number);
                  return new Date(year, month - 1, day).toLocaleDateString();
                })()}
                {#if daysRemaining !== null && daysRemaining >= 0}
                  <span class="subtle-text">(Fixes start in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''})</span>
                {/if}
              {/if}
            </span>
            {#if !isUatEndingSoon}
              <p class="uat-deadline-warning subtle-text">Once this deadline passes, no tasks may be added</p>
            {/if}
            {#if isUatExpired}
              <p class="uat-deadline-warning subtle-text">UAT submission deadline has passed, no tasks may be added</p>
            {/if}
            </div>
          </div>
        {/if}
        {#if uatFolderUrl}
          <ButtonComponent 
            element="a"
            text="UAT Folder"
            title="Upload images and other assets to this folder."
            href={uatFolderUrl.startsWith('http') ? uatFolderUrl : `https://${uatFolderUrl}`}
            type="primary"
            size="small"
            target="_blank"
            rel="nofollow noopener"
          />
        {/if}
      </div>
      <div class="button-group">
        {#if isAdmin}
          <ButtonComponent 
            element="button"
            text="Edit Account Info"
            type="primary"
            size="small"
            onClick={startEditingAccountInfo}
          />
        {/if}
        {#if isAdminAuthenticated}
          <ButtonComponent
            element="button"
            text={isAdmin ? "View as Customer" : "View as Admin"}
            onClick={onToggleAdminView}
            type="primary"
            size="small"
          />
        {/if}
      </div>
    {/if}
    {#if isAdmin}
      <div class="admin-controls">
        <label class="toggle-control">
          <input type="checkbox" bind:checked={disableAddTask} onchange={() => onSave?.()} />
          <span>Disable new UAT items (Fixing stage)</span>
        </label>
      </div>
    {/if}
  </div>

  <SearchFilters bind:searchQuery bind:filterType bind:filterOwner {isAdmin} {onAddTask} {onHelp} disableAddTask={effectiveDisableAddTask} />

  <div class="top-columns">
    {#if feedbackColumn && (isAdmin || feedbackColumn.items.length > 0)}
      <div class="feedback-section">
        <ColumnComponent
          column={feedbackColumn}
          {isAdmin}
          {displayName}
          variant={getColumnVariant(feedbackColumn.id)}
          isDragOver={dragOverColumn === feedbackColumn.id}
          draggedItemId={draggedItem?.id}
          {onDrop}
          {onDragOver}
          {onDragLeave}
          {onItemDragStart}
          {onItemClick}
          {onToggleLock}
        />
      </div>
    {/if}

    {#if retestColumn && (isAdmin || retestColumn.items.length > 0)}
      <div class="retest-section">
        <ColumnComponent
          column={retestColumn}
          {isAdmin}
          {displayName}
          variant={getColumnVariant(retestColumn.id)}
          isDragOver={dragOverColumn === retestColumn.id}
          draggedItemId={draggedItem?.id}
          {onDrop}
          {onDragOver}
          {onDragLeave}
          {onItemDragStart}
          {onItemClick}
          {onToggleLock}
        />
      </div>
    {/if}
  </div>

  <div class="columns" role="group" aria-label="Task board columns">
    {#each mainColumns as column}
      <ColumnComponent
        {column}
        {isAdmin}
        {displayName}
        variant={getColumnVariant(column.id)}
        isDragOver={dragOverColumn === column.id}
        draggedItemId={draggedItem?.id}
        {onDrop}
        {onDragOver}
        {onDragLeave}
        {onItemDragStart}
        {onItemClick}
        {onToggleLock}
      />
    {/each}
  </div>

  <div class="bottom-columns">
    {#if inProgressColumn && (isAdmin || inProgressColumn.items.length > 0)}
      <ColumnComponent
        column={inProgressColumn}
        {isAdmin}
        {displayName}
        variant="subtle"
        isDragOver={dragOverColumn === inProgressColumn.id}
        draggedItemId={draggedItem?.id}
        {onDrop}
        {onDragOver}
        {onDragLeave}
        {onItemDragStart}
        {onItemClick}
        {onToggleLock}
      />
    {/if}
    
    {#if cancelledColumn && (isAdmin || cancelledColumn.items.length > 0)}
      <ColumnComponent
        column={cancelledColumn}
        {isAdmin}
        {displayName}
        variant="subtle"
        isDragOver={dragOverColumn === cancelledColumn.id}
        draggedItemId={draggedItem?.id}
        {onDrop}
        {onDragOver}
        {onDragLeave}
        {onItemDragStart}
        {onItemClick}
        {onToggleLock}
      />
    {/if}
  </div>
</div>

<style>
  .account-info {
    margin-bottom: 2rem;
    gap: 1em;
    display: flex;
    flex-direction: column;
  }

  .header-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .header-container h1 {
    margin: 0;
    color: var(--fg-1);
    font-size: 2rem;
    flex: 1;
  }

  .uat-info-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 0 0 auto;
  }

  .uat-date-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .subtle-text {
    font-size: 0.8125rem;
    opacity: 0.7;
    font-style: italic;
    white-space: nowrap;
  }

  .uat-deadline-warning {
    position: absolute;
    top: 100%;
    left: 0;
    margin: 0.375rem 0 0 0;
  }

  .uat-end-date {
    color: var(--fg-2);
    font-size: 0.95rem;
    font-weight: 600;
    padding: 0.625rem 1.25rem;
    background: var(--bg-2);
    border-radius: var(--border-radius);
    border: 1px solid var(--bg-3);
    box-shadow: var(--shadow-sm);
  }

  .uat-end-date.warning {
    background: var(--warning-bg);
    color: var(--warning-fg);
    border-color: var(--warning);
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }

  .uat-end-date.error {
    background: var(--error-bg);
    color: var(--error-fg);
    border-color: var(--error);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
    font-weight: 700;
  }

  .edit-account-form {
    background: var(--bg-2);
    padding: 2rem;
    border-radius: var(--border-radius);
    margin-bottom: 1.5rem;
    border: 1px solid var(--bg-3);
    box-shadow: var(--shadow-md);
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--fg-1);
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
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

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    justify-content: flex-end;
  }

  .button-group {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    margin-top: 0.75rem;
  }

  .admin-controls {
    margin-top: 1rem;
    width: fit-content;
  }

  .toggle-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--fg-2);
    font-size: 0.95rem;
    cursor: pointer;
    user-select: none;
  }

  .toggle-control input[type="checkbox"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
  }

  .toggle-control:hover {
    color: var(--fg-1);
  }

  .top-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    align-items: stretch;
  }

  .top-columns > div > :global(.column) {
    min-height: auto;
  }

  .feedback-section {
    grid-column: span 1;
    min-width: 0;
    display: flex;
  }

  .feedback-section > :global(.column) {
    flex: 1;
  }

  .retest-section {
    grid-column: span 1;
    min-width: 0;
    display: flex;
  }

  .retest-section > :global(.column) {
    flex: 1;
  }

  .bottom-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
    align-items: stretch;
  }

  .bottom-columns > :global(.column) {
    min-height: auto;
  }

  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  @media (max-width: 768px) {
    .top-columns {
      flex-direction: column;
    }

    .columns {
      grid-template-columns: 1fr;
    }

    .header-container {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }

    .uat-date-container {
      width: 100%;
      margin-bottom: 2rem;
    }

    .uat-end-date {
      width: 100%;
      box-sizing: border-box;
    }

    .uat-deadline-warning {
      white-space: normal;
      max-width: 100%;
    }
  }
</style>
