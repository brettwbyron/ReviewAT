<script lang="ts">
  import type { ModalData, TaskType, Column, ColumnId, FeedbackItem } from '$lib/types';
  import { TASK_TYPES, DEVICE_TYPES, OWNER_TYPES } from '$lib/types';
  import { trapFocus } from '$lib/utils';

  import ButtonComponent from '$lib/components/Button.svelte';

  let {
    show = false,
    isNew = false,
    isViewOnly = false,
    isLocked = false,
    modalData = $bindable<ModalData>(),
    selectedColumnId = $bindable<ColumnId>(),
    columns,
    isAdmin = false,
    displayName = '',
    validationError = '',
    onSave,
    onDelete,
    onCancel
  }: {
    show: boolean;
    isNew: boolean;
    isViewOnly?: boolean;
    isLocked?: boolean;
    modalData: ModalData;
    selectedColumnId: ColumnId;
    columns: Column[];
    isAdmin?: boolean;
    displayName?: string;
    validationError?: string;
    onSave: () => void;
    onDelete: () => void;
    onCancel: () => void;
  } = $props();
  
  // Local state for new feedback input
  let newFeedbackText = $state('');
  let feedbackRole = $state<'pm' | 'developer' | undefined>(undefined);
  let editingFeedbackIndex = $state<number | null>(null);
  let editingFeedbackText = $state('');
  let editingFeedbackAuthor = $state<'pm' | 'developer' | undefined>(undefined);
  
  // Filter columns for non-admin users (exclude inprogress, feedback, retest, and cancelled, but always include the current column)
  const availableColumns = $derived(
    isAdmin 
      ? columns 
      : columns.filter(col => 
          col.id === selectedColumnId || 
          (col.id !== 'inprogress' && col.id !== 'feedback' && col.id !== 'retest' && col.id !== 'cancelled')
        )
  );
  
  // Format date for display
  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  // Format author label for display
  function formatAuthor(author: 'account' | 'pm' | 'developer' | 'admin'): string {
    if (author === 'pm') return 'PM';
    if (author === 'developer') return 'Developer';
    if (author === 'admin') return 'Admin';
    return displayName || 'Account';
  }
  
  // Handle save with new feedback
  function handleSaveClick() {
    // First, save any feedback that's currently being edited
    if (editingFeedbackIndex !== null) {
      if (!editingFeedbackText.trim()) {
        return; // Can't save empty feedback text
      }
      
      const updatedFeedback = [...modalData.feedback];
      const currentFeedback = updatedFeedback[editingFeedbackIndex];
      
      // For admins, require author selection; for accounts, keep as 'account'
      const newAuthor = isAdmin ? editingFeedbackAuthor : currentFeedback.author;
      
      if (isAdmin && !editingFeedbackAuthor) {
        return; // Admin must select an author when editing
      }
      
      updatedFeedback[editingFeedbackIndex] = {
        ...currentFeedback,
        text: editingFeedbackText.trim(),
        author: newAuthor!,
        editedAt: new Date().toISOString()
      };
      modalData.feedback = updatedFeedback;
      editingFeedbackIndex = null;
      editingFeedbackText = '';
      editingFeedbackAuthor = undefined;
    }
    
    // Then, add any new feedback text
    if (newFeedbackText.trim()) {
      if (isAdmin && !feedbackRole) {
        // Shouldn't happen with required radios, but add safety check
        return;
      }
      const newFeedback: FeedbackItem = {
        text: newFeedbackText.trim(),
        author: isAdmin ? feedbackRole! : 'account',
        createdAt: new Date().toISOString()
      };
      modalData.feedback = [...modalData.feedback, newFeedback];
      newFeedbackText = ''; // Clear the input
      feedbackRole = undefined; // Reset selection
    }
    onSave();
  }
  
  // Edit feedback
  function startEditFeedback(index: number) {
    editingFeedbackIndex = index;
    editingFeedbackText = modalData.feedback[index].text;
    const author = modalData.feedback[index].author;
    // Map author to editable format
    editingFeedbackAuthor = author === 'pm' ? 'pm' : author === 'developer' ? 'developer' : undefined;
  }
  
  function saveEditFeedback() {
    if (editingFeedbackIndex !== null && editingFeedbackText.trim()) {
      const updatedFeedback = [...modalData.feedback];
      const currentFeedback = updatedFeedback[editingFeedbackIndex];
      
      // For admins, require author selection; for accounts, keep as 'account'
      const newAuthor = isAdmin ? editingFeedbackAuthor : currentFeedback.author;
      
      if (isAdmin && !editingFeedbackAuthor) {
        return; // Admin must select an author
      }
      
      updatedFeedback[editingFeedbackIndex] = {
        ...currentFeedback,
        text: editingFeedbackText.trim(),
        author: newAuthor!,
        editedAt: new Date().toISOString()
      };
      modalData.feedback = updatedFeedback;
      editingFeedbackIndex = null;
      editingFeedbackText = '';
      editingFeedbackAuthor = undefined;
    }
  }
  
  function cancelEditFeedback() {
    editingFeedbackIndex = null;
    editingFeedbackText = '';
    editingFeedbackAuthor = undefined;
  }
  
  // Delete feedback
  function deleteFeedback(index: number) {
    modalData.feedback = modalData.feedback.filter((_, i) => i !== index);
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.code === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  // Image upload handling
  let fileInput = $state<HTMLInputElement>();
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB input limit (will be compressed)
  const TARGET_SIZE = 800 * 1024; // Target 800KB after compression
  const MAX_IMAGES = 5;

  let selectedImage = $state<string | null>(null);
  let descriptionTextarea = $state<HTMLTextAreaElement>();
  let newFeedbackTextarea = $state<HTMLTextAreaElement>();
  let editingFeedbackTextarea = $state<HTMLTextAreaElement>();
  let feedbackListContainer = $state<HTMLDivElement>();

  // Compress image using canvas
  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if too large (max 1920px wide)
          const MAX_WIDTH = 1920;
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Start with quality 0.9, reduce if needed
          let quality = 0.9;
          let result = canvas.toDataURL('image/jpeg', quality);
          
          // If still too large, reduce quality
          while (result.length > TARGET_SIZE * 1.37 && quality > 0.5) { // 1.37 = base64 overhead
            quality -= 0.1;
            result = canvas.toDataURL('image/jpeg', quality);
          }
          
          resolve(result);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // Auto-resize textarea based on content
  function adjustTextareaHeight(textarea: HTMLTextAreaElement) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  // Adjust height when modal opens or feedback editing starts
  $effect(() => {
    if (show && descriptionTextarea) {
      adjustTextareaHeight(descriptionTextarea);
    }
    if (show && newFeedbackTextarea) {
      adjustTextareaHeight(newFeedbackTextarea);
    }
    if (show && editingFeedbackIndex !== null && editingFeedbackTextarea) {
      adjustTextareaHeight(editingFeedbackTextarea);
    }
    // Scroll feedback list to bottom when modal opens
    if (show && feedbackListContainer) {
      feedbackListContainer.scrollTop = feedbackListContainer.scrollHeight;
    }
  });

  function handleImageClick(image: string) {
    selectedImage = image;
  }

  function closeImageModal() {
    selectedImage = null;
  }

  async function handleImageUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      target.value = '';
      return;
    }

    // Check file size before processing
    if (file.size > MAX_IMAGE_SIZE) {
      alert(`Image is too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
      target.value = '';
      return;
    }

    // Check max images
    if (modalData.images.length >= MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images allowed`);
      target.value = '';
      return;
    }

    try {
      // Compress the image
      const compressed = await compressImage(file);
      modalData.images = [...modalData.images, compressed];
      target.value = ''; // Reset input
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try another file.');
      target.value = '';
    }
  }

  function removeImage(index: number) {
    modalData.images = modalData.images.filter((_, i) => i !== index);
  }

</script>

{#if show}
  <div 
    class="modal-overlay" 
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
    onclick={handleOverlayClick}
    onkeydown={handleKeydown}
  >
    <div class="modal" {@attach trapFocus}>
      <div class="modal-header">
        <h2 id="modal-title">{isViewOnly ? 'View Task (Read-Only)' : isNew ? 'Add Task' : 'Edit Task'}</h2>
        <button class="close-btn" aria-label="Close modal" onclick={onCancel}>×</button>
      </div>
      
      <div class="modal-body">
        {#if validationError}
          <div class="error-message">{validationError}</div>
        {/if}

        <div class="form-group">
          <label for="status">Status</label>
          <select id="status" bind:value={selectedColumnId} disabled={isViewOnly}>
            {#each availableColumns as column}
              <option value="{column.id}">{column.title}</option>
            {/each}
          </select>
        </div>

        {#if isAdmin}
           <div class="form-group">
             <label for="type">Type *</label>
             <select id="type" bind:value={modalData.type} disabled={isViewOnly || (isLocked && !isAdmin)}>
               {#each TASK_TYPES as type}
                 <option value="{type}">{type}</option>
               {/each}
             </select>
           </div>
        {/if}

        <div class="form-group">
          <label for="device">Device</label>
          <select id="device" bind:value={modalData.device} disabled={isViewOnly || (isLocked && !isAdmin)}>
            {#each DEVICE_TYPES as device}
              <option value="{device}">{device}</option>
            {/each}
          </select>
        </div>

        {#if isAdmin}
          <div class="form-group">
            <label for="owner">Owner *</label>
            <select id="owner" bind:value={modalData.owner} required>
              <option value="">-- Not Set --</option>
              {#each OWNER_TYPES as owner}
                <option value="{owner}">{owner}</option>
              {/each}
            </select>
          </div>
        {/if}

        <div class="form-group">
          <label for="description">Description *</label>
          <textarea 
            id="description"
            bind:this={descriptionTextarea}
            bind:value={modalData.description}
            oninput={(e) => adjustTextareaHeight(e.currentTarget)}
            maxlength="500"
            placeholder="Enter task description..."
            disabled={isViewOnly || (isLocked && !isAdmin)}
            readonly={isViewOnly || (isLocked && !isAdmin)}
          ></textarea>
          <small>{modalData.description.length}/500 characters</small>
        </div>

        <div class="form-group">
          <label for="section">Section / Page</label>
          <input 
            type="text" 
            id="section"
            bind:value={modalData.section}
            placeholder="e.g., Header, Home Page, Categories..."
            disabled={isViewOnly || (isLocked && !isAdmin)}
            readonly={isViewOnly || (isLocked && !isAdmin)}
          />
        </div>

        <div class="form-group">
          <div class="label">Feedback / Notes</div>
          
          {#if modalData.feedback.length > 0}
            <div class="feedback-list" bind:this={feedbackListContainer}>
              {#each modalData.feedback as feedbackItem, index}
                <div 
                  class="feedback-item"
                  class:feedback-align-left={(isAdmin && feedbackItem.author === 'account') || (!isAdmin && feedbackItem.author !== 'account')}
                  class:feedback-align-right={(isAdmin && feedbackItem.author !== 'account') || (!isAdmin && feedbackItem.author === 'account')}
                >
                  {#if editingFeedbackIndex === index}
                    <!-- Edit mode -->
                    {#if isAdmin}
                      <div class="feedback-role-selector">
                        <label>
                          <input type="radio" bind:group={editingFeedbackAuthor} value="developer" required />
                          <span>Developer</span>
                        </label>
                        <label>
                          <input type="radio" bind:group={editingFeedbackAuthor} value="pm" required />
                          <span>PM</span>
                        </label>
                      </div>
                    {/if}
                    <textarea
                      bind:this={editingFeedbackTextarea}
                      bind:value={editingFeedbackText}
                      rows="3"
                      class="feedback-edit-textarea"
                      oninput={(e) => adjustTextareaHeight(e.currentTarget)}
                    ></textarea>
                    <div class="feedback-edit-actions">
                      <button type="button" class="feedback-save-btn" onclick={saveEditFeedback}>Save</button>
                      <button type="button" class="feedback-cancel-btn" onclick={cancelEditFeedback}>Cancel</button>
                    </div>
                  {:else}
                    <!-- View mode -->
                    <div class="feedback-header">
                      <span 
                        class="feedback-author" 
                        class:pm={feedbackItem.author === 'pm'}
                        class:developer={feedbackItem.author === 'developer'}
                        class:account={feedbackItem.author === 'account'}
                      >
                        {formatAuthor(feedbackItem.author)}
                      </span>
                      <div class="feedback-header-right">
                        <span class="feedback-date">
                          {formatDate(feedbackItem.createdAt)}
                          {#if feedbackItem.editedAt}
                            <span class="edited-indicator" title={'Edited at ' + formatDate(feedbackItem.editedAt)}>(edited)</span>
                          {/if}
                        </span>
                        {#if isAdmin && feedbackItem.author !== 'account'}
                          <button type="button" class="feedback-action-btn" onclick={() => startEditFeedback(index)} title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button type="button" class="feedback-action-btn delete" onclick={() => deleteFeedback(index)} title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              <line x1="10" y1="11" x2="10" y2="17"/>
                              <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                          </button>
                        {:else if !isAdmin && feedbackItem.author === 'account'}
                          <button type="button" class="feedback-action-btn" onclick={() => startEditFeedback(index)} title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        {/if}
                      </div>
                    </div>
                    <div class="feedback-text">{feedbackItem.text}</div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
          
          {#if !isViewOnly}
            {#if isAdmin}
              <div class="feedback-role-selector">
                <label>
                  <input type="radio" bind:group={feedbackRole} value="developer" required />
                  <span>Developer</span>
                </label>
                <label>
                  <input type="radio" bind:group={feedbackRole} value="pm" required />
                  <span>PM</span>
                </label>
              </div>
            {/if}
            <textarea 
              id="feedback"
              bind:this={newFeedbackTextarea}
              bind:value={newFeedbackText}
              rows="3"
              placeholder="Add new feedback or notes..."
              oninput={(e) => adjustTextareaHeight(e.currentTarget)}
            ></textarea>
          {/if}
        </div>

        <div class="form-group">
          <div class="label">Screenshots ({modalData.images.length}/{MAX_IMAGES})</div>
          {#if modalData.images.length > 0}
            <div class="image-preview-container">
              {#each modalData.images as image, index}
                <div class="image-preview">
                  <button
                    class="image-preview-btn"
                    onclick={() => handleImageClick(image)}
                    aria-label="View full size image {index + 1}"
                    type="button"
                  >
                    <img src={image} alt="Uploaded image {index + 1}" />
                  </button>
                  {#if (!isViewOnly && !isLocked) || isAdmin}
                    <button 
                      class="remove-image-btn" 
                      onclick={() => removeImage(index)}
                      aria-label="Remove image"
                      type="button"
                    >
                      ×
                    </button>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
          {#if !isViewOnly && modalData.images.length < MAX_IMAGES}
            <input
              type="file"
              bind:this={fileInput}
              onchange={handleImageUpload}
              accept="image/*"
              class="file-input"
              aria-label="Upload image"
              disabled={isViewOnly}
              readonly={isViewOnly}
            />
            {#if (!isViewOnly) || isAdmin}
              <ButtonComponent 
                element="button"
                text="+ Attach Image"
                type="primary"
                size="small"
                onClick={() => fileInput?.click()}
              />
              <small>Max {MAX_IMAGE_SIZE / 1024 / 1024}MB per image, {MAX_IMAGES} images total. <em>Upload replacement images/assets to the UAT Folder.</em></small>
            {/if}
          {/if}
        </div>
      </div>

      <div class="modal-footer">
        <div class="modal-footer-left">
          {#if !isNew && !isViewOnly}
            {#if !isAdmin && isLocked}
              <div class="lock-message">
                <span class="lock-icon">🔒</span>
                <span>Task locked - Work has been started. Only status and feedback can be changed.</span>
              </div>
            {:else if !isLocked || isAdmin}
              <ButtonComponent 
                element="button"
                text="Delete"
                type="delete"
                onClick={onDelete}
              />
            {/if}
          {/if}
        </div>
        <div class="modal-footer-right">
          <ButtonComponent 
            element="button"
            text={isViewOnly ? 'Close' : 'Cancel'}
            type="cancel"
            onClick={onCancel}
          />
          {#if !isViewOnly}
            <ButtonComponent 
              element="button"
              text="Save"
              type="save"
              onClick={handleSaveClick}
            />
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

{#if selectedImage}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="image-modal-overlay" {@attach trapFocus} onclick={closeImageModal} onkeydowncapture={(e) => { if (e.code === "Escape") { e.stopPropagation(); closeImageModal(); } }}>
    <div class="image-modal-content" onclick={(e) => e.stopPropagation()}>
      <button class="image-close-btn" onclick={closeImageModal} aria-label="Close image viewer">
        ×
      </button>
      <img src={selectedImage} alt="Full size view" />
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
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--bg-2);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    max-width: 800px;
    width: 90%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--bg-3);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h2 {
    margin: 0;
    color: var(--fg-1);
    font-size: 1.5rem;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: var(--fg-2);
    line-height: 1;
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
    overflow-y: auto;
    flex: 1;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label,
  .form-group .label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--fg-1);
    font-weight: 600;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--bg-3);
    border-radius: 4px;
    font-size: 1rem;
    background: var(--bg-1);
    color: var(--fg-1);
    font-family: inherit;
    box-sizing: border-box;
  }

  .form-group textarea {
    min-height: 4rem;
    resize: none;
    overflow-y: hidden;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-light);
  }

  .form-group input:disabled,
  .form-group select:disabled,
  .form-group textarea:disabled,
  .form-group input:read-only,
  .form-group textarea:read-only {
    background: transparent;
    border: none;
    border-top: 2px solid var(--bg-3);
    border-bottom: 2px solid var(--bg-3);
    padding-left: 0;
    padding-right: 0;
    opacity: 1;
    color: var(--fg-1);
    cursor: default;
  }

  .form-group select:disabled {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }

  .form-group small {
    display: block;
    margin-top: 0.25rem;
    color: var(--fg-2);
    font-size: 0.875rem;
  }

  .error-message {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #ffebee;
    color: #c62828;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--bg-3);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5em;
  }

  .modal-footer-left {
    display: flex;
    gap: 0.75rem;
  }

  .modal-footer-right {
    display: flex;
    gap: 0.75rem;
  }

  .lock-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #fff3e0;
    border-radius: 4px;
    color: #e65100;
    font-size: 0.9rem;
    line-height: 1.4;
    max-width: 400px;
  }

  .lock-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .file-input {
    display: none;
  }

  .image-preview-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .image-preview {
    position: relative;
    width: 120px;
    height: 120px;
    border-radius: 4px;
    overflow: hidden;
    border: 2px solid var(--bg-3);
  }

  .image-preview-btn {
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    display: block;
    transition: opacity 0.2s;
  }

  .image-preview-btn:hover {
    opacity: 0.8;
  }

  .image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .remove-image-btn {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 28px;
    height: 28px;
    background: rgba(244, 67, 54, 0.9);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.5rem;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    padding: 0;
  }

  .remove-image-btn:hover {
    background: rgba(211, 47, 47, 1);
  }

  .image-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    cursor: pointer;
  }

  .image-modal-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    cursor: default;
  }

  .image-modal-content img {
    max-width: 90vw;
    max-height: 90vh;
    width: auto;
    height: auto;
    display: block;
    border-radius: 8px;
  }

  .image-close-btn {
    position: absolute;
    top: -2.5rem;
    right: 0;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .image-close-btn:hover {
    background: white;
  }

  .feedback-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
    max-height: 600px;
    overflow-y: auto;
    padding: 0.5rem;
    background: var(--bg-1);
    border-radius: 4px;
    box-shadow: inset 0 0 8px var(--primary-shadow-color);
  }

  .feedback-item {
    background: var(--bg-2);
    border: 1px solid var(--bg-3);
    border-radius: 4px;
    padding: 0.75rem;
    width: 75%;
  }
  
  .feedback-item.feedback-align-left {
    margin-right: auto;
    margin-left: 0;
  }
  
  .feedback-item.feedback-align-right {
    margin-left: auto;
    margin-right: 0;
  }

  .feedback-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--bg-3);
  }
  
  .feedback-header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .feedback-author {
    font-size: 0.85rem;
    font-weight: 600;
  }
  
  /* Account - error colors */
  .feedback-author.account {
    color: var(--error);
  }

  :global(.dark) .feedback-author.account {
    color: var(--error-bg);
  }
  
  /* PM - info colors */
  .feedback-author.pm {
    color: var(--info);
  }

  :global(.dark) .feedback-author.pm {
    color: var(--info-bg);
  }

  /* Developer - primary colors */
  .feedback-author.developer {
    color: var(--primary);
  }

  :global(.dark) .feedback-author.developer {
    color: var(--primary-light);
  }

  .feedback-date {
    font-size: 0.75rem;
    color: var(--fg-2);
  }
  
  .edited-indicator {
    font-style: italic;
    margin-left: 0.3rem;
    opacity: 0.7;
  }
  
  .feedback-action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    opacity: 0.6;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .feedback-action-btn svg {
    width: 1rem;
    height: 1rem;
    color: var(--fg-2);
  }
  
  .feedback-action-btn:hover {
    opacity: 1;
  }
  
  .feedback-action-btn.delete:hover svg {
    color: var(--error);
  }
  
  :global(.dark) .feedback-action-btn.delete:hover svg {
    color: var(--error-bg);
  }
  
  .feedback-role-selector {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background: var(--bg-1);
    border-radius: 4px;
  }
  
  .feedback-role-selector label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--fg-1);
    white-space: nowrap;
  }
  
  .feedback-role-selector input[type="radio"] {
    cursor: pointer;
  }
  
  .feedback-edit-textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--bg-3);
    border-radius: 4px;
    background: var(--bg-1);
    color: var(--fg-1);
    font-family: inherit;
    font-size: 0.9rem;
    resize: vertical;
    margin-bottom: 0.5rem;
  }
  
  .feedback-edit-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  
  .feedback-save-btn,
  .feedback-cancel-btn {
    padding: 0.4rem 0.8rem;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  .feedback-save-btn {
    background: var(--primary);
    color: white;
  }
  
  .feedback-save-btn:hover {
    opacity: 0.9;
  }
  
  .feedback-cancel-btn {
    background: var(--bg-3);
    color: var(--fg-1);
  }
  
  .feedback-cancel-btn:hover {
    opacity: 0.8;
  }

  .feedback-text {
    color: var(--fg-1);
    font-size: 0.9rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  @media (max-width: 768px) {
    .modal {
      width: 95%;
    }

    .modal-footer {
      flex-direction: column-reverse;
      gap: 1rem;
    }

    .modal-footer-left,
    .modal-footer-right {
      width: 100%;
    }
  }
</style>
