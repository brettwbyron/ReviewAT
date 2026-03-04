<script lang="ts">
  import { trapFocus } from '$lib/utils';
  import ButtonComponent from '$lib/components/Button.svelte';

  let {
    show = false,
    disableAddTask = false,
    onClose
  }: {
    show: boolean;
    disableAddTask: boolean;
    onClose: () => void;
  } = $props();

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.code === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }
</script>

{#if show}
  <div 
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={handleOverlayClick}
    onkeydown={handleKeydown}
  >
    <div class="modal" {@attach trapFocus}>
      <div class="modal-header">
        <h2>Help</h2>
        <button class="close-btn" aria-label="Close help" onclick={onClose}>×</button>
      </div>
      {#if disableAddTask}
         <div class="modal-header">
          <h2>UAT Fixing Stage</h2>
        </div>
        <div class="modal-body">
          <div class="modal-section">
            <p>UAT item creation disabled - The UAT process is now in the Fixing stage where created items are being worked on. No new items can be added at this time.</p>
          </div>
        </div>
      {/if}
      <div class="modal-header">
        <h2>Images & Assets</h2>
      </div>
      <div class="modal-body">
        <div class="modal-section">
          <p>All images and assets needed for your feedback or requests should be uploaded to the <strong>UAT Folder</strong>.</p>
          <p>You can access the UAT Folder by clicking the <strong>"UAT Folder"</strong> button next to the UAT Review Deadline.</p>
        </div>
      </div>
      <div class="modal-header">
        <h2>Status Guide</h2>
      </div>
      <div class="modal-body">
        <div class="modal-section info-variant">
          <h3>To Do</h3>
          <p>By default, all UAT items should be set to "To Do"</p>
          <p>You'll also need to set any items that has failed during re-test back to "To Do"</p>
        </div>

        <div class="modal-section warning-variant">
          <h3>Feedback Needed</h3>
          <p>Requires your attention, please check under the "Feedback Needed" column as we will input any questions on there</p>
          <p>Please change the status to "To Do" after you have provided your feedback</p>
        </div>

        <div class="modal-section alert-variant">
          <h3>Re-Test</h3>
          <p>Item has been updated and is ready to be tested again</p>
        </div>

        <div class="modal-section success-variant">
          <h3>Approved</h3>
          <p>Item is confirmed to be fixed / resolved</p>
        </div>

        <div class="modal-section subtle-variant">
          <h3>In Progress</h3>
          <p>This means that we are working on the specific UAT item</p>
        </div>

        <div class="modal-section subtle-variant">
          <h3>Cancelled</h3>
          <p>Item is cancelled</p>
        </div>
      </div>
      <div class="modal-footer">
        <ButtonComponent 
          element="button"
          text="Close"
          type="primary"
          onClick={onClose}
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
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal {
    background: var(--bg-1);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 600px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--bg-3);
    overflow: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--bg-3);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--fg-1);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: var(--fg-2);
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: var(--fg-1);
  }

  .modal-body {
    padding: 1.5rem;
    flex: 1;
  }

  .modal-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--bg-2);
    border-radius: 8px;
    border-left: 4px solid var(--primary);
  }

  .modal-section:last-child {
    margin-bottom: 0;
  }

  .modal-section h3 {
    margin: 0 0 0.75rem 0;
    color: var(--primary);
    font-size: 1.1rem;
    font-weight: 700;
  }

  /* Alert variant (Needs Feedback) */
  .modal-section.alert-variant {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-left: 4px solid var(--error);
  }

  .modal-section.alert-variant h3 {
    color: #991b1b;
  }

  /* Warning variant (Re-Test) */
  .modal-section.warning-variant {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-left: 4px solid var(--warning);
  }

  .modal-section.warning-variant h3 {
    color: #92400e;
  }

  /* Info variant (To Do) */
  .modal-section.info-variant {
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border-left: 4px solid var(--primary);
  }

  .modal-section.info-variant h3 {
    color: #3730a3;
  }

  /* Success variant (Approved) */
  .modal-section.success-variant {
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border-left: 4px solid var(--success);
  }

  .modal-section.success-variant h3 {
    color: #065f46;
  }

  /* Subtle variant (In Progress, Cancelled) */
  .modal-section.subtle-variant {
    background: var(--bg-1);
    border-left: 4px solid var(--bg-3);
    opacity: 0.8;
  }

  .modal-section.subtle-variant h3 {
    color: var(--fg-2);
  }

  /* Dark mode styles */
  :global(.dark) .modal-section.alert-variant {
    background: linear-gradient(135deg, rgba(255, 235, 238, 0.15) 0%, rgba(255, 205, 210, 0.15) 100%);
    border-color: rgba(244, 67, 54, 0.6);
  }

  :global(.dark) .modal-section.alert-variant h3 {
    color: #ffcdd2;
  }

  :global(.dark) .modal-section.warning-variant {
    background: linear-gradient(135deg, rgba(255, 243, 224, 0.15) 0%, rgba(255, 224, 178, 0.15) 100%);
    border-color: rgba(255, 152, 0, 0.6);
  }

  :global(.dark) .modal-section.warning-variant h3 {
    color: #ffe0b2;
  }

  :global(.dark) .modal-section.info-variant {
    background: linear-gradient(135deg, rgba(227, 242, 253, 0.15) 0%, rgba(187, 222, 251, 0.15) 100%);
    border-color: rgba(33, 150, 243, 0.6);
  }

  :global(.dark) .modal-section.info-variant h3 {
    color: #bbdefb;
  }

  :global(.dark) .modal-section.success-variant {
    background: linear-gradient(135deg, rgba(232, 245, 233, 0.15) 0%, rgba(200, 230, 201, 0.15) 100%);
    border-color: rgba(76, 175, 80, 0.6);
  }

  :global(.dark) .modal-section.success-variant h3 {
    color: #c8e6c9;
  }

  .modal-section p {
    margin: 0.5rem 0;
    color: var(--fg-1);
    line-height: 1.5;
  }

  .modal-section p:first-of-type {
    margin-top: 0;
  }

  .modal-section p:last-child {
    margin-bottom: 0;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--bg-3);
    display: flex;
    justify-content: flex-end;
  }

  @media (max-width: 768px) {
    .modal {
      max-width: 100%;
      max-height: 90vh;
    }

    .modal-body {
      padding: 1rem;
    }

    .modal-section {
      padding: 0.75rem;
    }
  }
</style>
