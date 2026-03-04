<script lang="ts">
  import type { ConflictData, TaskChange } from '$lib/types';
  import { trapFocus } from '$lib/utils';
  import ButtonComponent from './Button.svelte';

  let {
    show = false,
    conflictData,
    loading = false,
    onUseRemote,
    onCancel
  }: {
    show: boolean;
    conflictData: ConflictData;
    loading?: boolean;
    onUseRemote: () => void;
    onCancel: () => void;
  } = $props();

  function formatChangeType(changeType: string): string {
    switch (changeType) {
      case 'added': return 'Added';
      case 'modified': return 'Modified';
      case 'deleted': return 'Deleted';
      case 'moved': return 'Moved';
      default: return changeType;
    }
  }

  function formatColumnName(columnId: string): string {
    const columnNames: Record<string, string> = {
      'todo': 'To Do',
      'inprogress': 'In Progress',
      'retest': 'Re-Test',
      'feedback': 'Feedback Needed',
      'done': 'Done',
      'cancelled': 'Cancelled'
    };
    return columnNames[columnId] || columnId;
  }

  function formatChange(change: TaskChange): string {
    const type = formatChangeType(change.changeType);
    const taskDesc = change.task.description.substring(0, 50) + (change.task.description.length > 50 ? '...' : '');
    
    if (change.changeType === 'moved' && change.fromColumn && change.toColumn) {
      return `${type}: "${taskDesc}" from ${formatColumnName(change.fromColumn)} to ${formatColumnName(change.toColumn)}`;
    } else if (change.changeType === 'added' && change.toColumn) {
      return `${type}: "${taskDesc}" in ${formatColumnName(change.toColumn)}`;
    } else if (change.changeType === 'deleted' && change.fromColumn) {
      return `${type}: "${taskDesc}" from ${formatColumnName(change.fromColumn)}`;
    } else if (change.changeType === 'modified' && change.toColumn) {
      return `${type}: "${taskDesc}" in ${formatColumnName(change.toColumn)}`;
    }
    return `${type}: "${taskDesc}"`;
  }
</script>

{#if show}
  <div 
    class="modal-overlay" 
    onclick={onCancel}
    onkeydown={(e) => e.key === 'Escape' && onCancel()}
    role="button" 
    tabindex="-1"
    {@attach trapFocus}
  >
    <div
      class="modal conflict-modal"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="0"
      aria-labelledby="conflict-title"
      aria-modal="true"
    >
      <div class="modal-header">
        <h2 id="conflict-title">⚠️ Conflicting Changes Detected</h2>
      </div>

      <div class="modal-body">
        <p class="conflict-warning">
          Someone else has made changes to this board while you were working. Please review the changes and decide how to proceed.
        </p>

        {#if conflictData.localChanges.length > 0}
          <div class="changes-section">
            <h3>Your Changes ({conflictData.localChanges.length})</h3>
            <ul class="changes-list">
              {#each conflictData.localChanges as change}
                <li class="change-item local-change">
                  {formatChange(change)}
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if conflictData.remoteChanges.length > 0}
          <div class="changes-section">
            <h3>Server Changes ({conflictData.remoteChanges.length})</h3>
            <ul class="changes-list">
              {#each conflictData.remoteChanges as change}
                <li class="change-item remote-change">
                  {formatChange(change)}
                </li>
              {/each}
            </ul>
          </div>
        {:else}
          <div class="changes-section">
            <h3>Server Changes</h3>
            <p class="cache-note">
              The server has changes, but due to GitHub's caching, we can't show the exact details right now. 
              Choose "Use Server Version" to reload with the latest data from the server.
            </p>
          </div>
        {/if}

        <div class="conflict-options">
          <p><strong>What would you like to do?</strong></p>
          <ul>
            <li><strong>Use Server Version:</strong> Reload with the latest data from the server. Any unsaved local changes will be lost. <strong>This can take up to 30s. Please be patient as the items are updated.</strong></li>
            <li><strong>Cancel:</strong> Close this dialog and keep editing. Your changes won't be saved until the conflict is resolved.</li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <ButtonComponent
          element="button"
          text="Cancel"
          type="cancel"
          disabled={loading}
          onClick={onCancel}
        />
        <ButtonComponent
          element="button"
          text="Use Server Version"
          loadingText="Fetching Server Version..."
          type="primary"
          loading={loading}
          onClick={onUseRemote}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .conflict-modal {
    background: var(--bg-1);
    border-radius: var(--border-radius);
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--bg-3);
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--bg-3);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--warning);
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .conflict-warning {
    margin: 0 0 1.5rem 0;
    padding: 1rem;
    background: rgba(255, 193, 7, 0.1);
    border-left: 3px solid var(--warning);
    border-radius: 4px;
    color: var(--fg-1);
  }

  .changes-section {
    margin-bottom: 1.5rem;
  }

  .changes-section h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.1rem;
    color: var(--fg-1);
  }

  .changes-section p {
    margin: 0;
    color: var(--fg-2);
    line-height: 1.5;
  }

  .cache-note {
    padding: 0.75rem;
    background: rgba(255, 193, 7, 0.1);
    border-radius: 4px;
    font-style: italic;
  }

  .changes-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .change-item {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    border-left: 3px solid;
  }

  .local-change {
    background: rgba(33, 150, 243, 0.1);
    border-left-color: var(--primary);
    color: var(--fg-1);
  }

  .remote-change {
    background: rgba(156, 39, 176, 0.1);
    border-left-color: #9c27b0;
    color: var(--fg-1);
  }

  .conflict-options {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--bg-2);
    border-radius: 4px;
  }

  .conflict-options p {
    margin: 0 0 0.75rem 0;
    color: var(--fg-1);
  }

  .conflict-options ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--fg-2);
  }

  .conflict-options li {
    margin-bottom: 0.5rem;
  }

  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--bg-3);
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }
</style>
