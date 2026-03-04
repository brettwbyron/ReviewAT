import type { Column, ColumnId, BoardData, Task, TaskChange, ConflictData } from './types';
import { Octokit } from 'octokit';

// UTF-8 safe base64 encoding (supports all Unicode characters including emojis)
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString);
}

// UTF-8 safe base64 decoding
function base64ToUtf8(base64: string): string {
  const binString = atob(base64);
  const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
  return new TextDecoder().decode(bytes);
}

// Focus trap action for modals
export function trapFocus(node: HTMLElement) {
  const previouslyFocused = document.activeElement as HTMLElement;

  function focusable() {
    return Array.from(
      node.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;

    const current = document.activeElement;
    const elements = focusable();
    const first = elements[0];
    const last = elements[elements.length - 1];

    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const elements = focusable();
  if (elements.length > 0) {
    elements[0].focus();
  }

  node.addEventListener('keydown', handleKeydown);

  return () => {
    node.removeEventListener('keydown', handleKeydown);
    if (previouslyFocused) {
      previouslyFocused.focus();
    }
  };
}

// SHA-256 password hashing
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get default empty columns
export function getDefaultColumns(): Column[] {
  return [
    { id: 'todo', title: 'To Do', items: [] },
    { id: 'inprogress', title: 'In Progress', items: [] },
    { id: 'retest', title: 'Re-Test', items: [] },
    { id: 'feedback', title: 'Feedback Needed', items: [] },
    { id: 'approved', title: 'Approved', items: [] },
    { id: 'cancelled', title: 'Cancelled', items: [] }
  ];
}

// GitHub API functions
export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
  branch: string;
}

export async function listAllDataFromGitHub(
  octokit: Octokit,
  config: GitHubConfig
) {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: 'data',
      ref: config.branch
    });

    const dataFiles = response.data;
    
    if (!Array.isArray(dataFiles)) {
      console.error('Expected array of files but received:', typeof dataFiles);
      return false;
    }
    
    return dataFiles.filter(file => file.name !== '.gitkeep');
  } catch (error) {
    console.error('Error loading customer list:', error);
    return false;
  }
}

export async function loadDataFromGitHub(
  octokit: Octokit,
  config: GitHubConfig,
  customerId: string,
  password: string
): Promise<{ success: boolean; data?: Column[]; error?: string; isNew?: boolean; sha?: string; passwordHash?: string; disableAddTask?: boolean; displayName?: string; uatEndDate?: string; devSiteUrl?: string; uatFolderUrl?: string; contactEmails?: string; version?: number }> {
  try {
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: `data/${customerId.toLowerCase()}.json`,
      ref: config.branch
    });

    if (Array.isArray(fileData) || !('content' in fileData)) {
      throw new Error('Unexpected response format');
    }

    let content: BoardData;
    
    // For large files (>1MB), GitHub returns empty content and we need to use the Blob API
    if (!fileData.content && fileData.sha) {
      const { data: blobData } = await octokit.rest.git.getBlob({
        owner: config.owner,
        repo: config.repo,
        file_sha: fileData.sha
      });
      
      // Blob API returns base64 encoded content
      const decodedString = base64ToUtf8(blobData.content.replace(/\n/g, ''));
      content = JSON.parse(decodedString);
    } else {
      // Decode base64 content for smaller files
      const base64Content = fileData.content.replace(/\n/g, '');
      const decodedString = base64ToUtf8(base64Content);
      content = JSON.parse(decodedString);
    }

    // Verify password
    const inputHash = await hashPassword(password);
    if (content.passwordHash !== inputHash) {
      return { success: false, error: 'Incorrect password' };
    }

    // Validate data format
    if (content.columns) {
      // Merge loaded data with default columns structure
      const defaultColumns = getDefaultColumns();
      const mergedColumns = defaultColumns.map(defaultCol => {
        const loadedCol = content.columns.find(col => col.id === defaultCol.id);
        return {
          ...defaultCol,
          items: loadedCol?.items || []
        };
      });
      
      return { 
        success: true, 
        data: mergedColumns,
        isNew: false,
        sha: fileData.sha,
        passwordHash: content.passwordHash,
        disableAddTask: content.disableAddTask || false,
        displayName: content.displayName,
        uatEndDate: content.uatEndDate,
        devSiteUrl: content.devSiteUrl,
        uatFolderUrl: content.uatFolderUrl,
        contactEmails: content.contactEmails,
        version: content.version || 0
      };
    } else {
      throw new Error('Invalid data format');
    }
  } catch (error: any) {
    if (error.status === 404) {
      return {
        success: false,
        error: 'Account not found. Please check your username and try again.'
      };
    }

    console.error('Failed to load data:', error);
    return { 
      success: false, 
      error: 'Failed to load data. Check configuration.' 
    };
  }
}

export async function saveDataToGitHub(
  octokit: Octokit,
  config: GitHubConfig,
  customerId: string,
  data: BoardData,
  message: string = 'Update board data',
  fileSha?: string | null
): Promise<{ success: boolean; sha?: string; error?: string; conflict?: boolean }> {
  try {
    // Increment version before saving
    const dataWithVersion = {
      ...data,
      version: (data.version || 0) + 1
    };
    
    const params: any = {
      owner: config.owner,
      repo: config.repo,
      path: `data/${customerId.toLowerCase()}.json`,
      message,
      content: utf8ToBase64(JSON.stringify(dataWithVersion, null, 2)),
      branch: config.branch
    };

    if (fileSha) {
      params.sha = fileSha;
    }

    const { data: result } = await octokit.rest.repos.createOrUpdateFileContents(params);
    return { 
      success: true, 
      sha: result.content?.sha
    };
  } catch (error: any) {
    // 409 Conflict means someone else modified the file - return conflict flag
    if (error.status === 409) {
      return { 
        success: false,
        conflict: true,
        error: 'Someone else has modified this data. Please review the changes.'
      };
    }
    
    console.error('Failed to save data:', error);
    return { 
      success: false, 
      error: 'Failed to save data to GitHub' 
    };
  }
}

export async function loadDataFromGitHubAdmin(
  octokit: Octokit,
  config: GitHubConfig,
  customerId: string
): Promise<{ success: boolean; data?: Column[]; error?: string; sha?: string; passwordHash?: string; disableAddTask?: boolean; displayName?: string; uatEndDate?: string; devSiteUrl?: string; uatFolderUrl?: string; contactEmails?: string; version?: number }> {
  try {
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: `data/${customerId.toLowerCase()}.json`,
      ref: config.branch
    });

    if (Array.isArray(fileData) || !('content' in fileData)) {
      throw new Error('Unexpected response format');
    }

    let content: BoardData;
    
    // For large files (>1MB), GitHub returns empty content and we need to use the Blob API
    if (!fileData.content && fileData.sha) {
      const { data: blobData } = await octokit.rest.git.getBlob({
        owner: config.owner,
        repo: config.repo,
        file_sha: fileData.sha
      });
      
      // Blob API returns base64 encoded content
      const decodedString = base64ToUtf8(blobData.content.replace(/\n/g, ''));
      content = JSON.parse(decodedString);
    } else {
      // Decode base64 content for smaller files
      const base64Content = fileData.content.replace(/\n/g, '');
      const decodedString = base64ToUtf8(base64Content);
      content = JSON.parse(decodedString);
    }

    // Validate data format
    if (content.columns) {
      // Merge loaded data with default columns structure
      const defaultColumns = getDefaultColumns();
      const mergedColumns = defaultColumns.map(defaultCol => {
        const loadedCol = content.columns.find(col => col.id === defaultCol.id);
        return {
          ...defaultCol,
          items: loadedCol?.items || []
        };
      });
      
      return { 
        success: true, 
        data: mergedColumns,
        sha: fileData.sha,
        passwordHash: content.passwordHash,
        disableAddTask: content.disableAddTask || false,
        displayName: content.displayName,
        uatEndDate: content.uatEndDate,
        devSiteUrl: content.devSiteUrl,
        uatFolderUrl: content.uatFolderUrl,
        contactEmails: content.contactEmails,
        version: content.version || 0
      };
    } else {
      throw new Error('Invalid data format');
    }
  } catch (error: any) {
    // 404 is expected for new accounts, don't log it as an error
    if (error.status !== 404) {
      console.error('Failed to load data:', error);
    }
    return { 
      success: false, 
      error: error.status === 404 ? 'Account not found' : 'Failed to load data. Check configuration.' 
    };
  }
}

export async function deleteDataFromGitHub(
  octokit: Octokit,
  config: GitHubConfig,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First get the file to get its SHA
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: `data/${customerId.toLowerCase()}.json`,
      ref: config.branch
    });

    if (Array.isArray(fileData) || !('sha' in fileData)) {
      throw new Error('Unexpected response format');
    }

    // Delete the file
    await octokit.rest.repos.deleteFile({
      owner: config.owner,
      repo: config.repo,
      path: `data/${customerId.toLowerCase()}.json`,
      message: `Delete customer: ${customerId}`,
      sha: fileData.sha,
      branch: config.branch
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to delete data:', error);
    return { 
      success: false, 
      error: 'Failed to delete customer data from GitHub' 
    };
  }
}

// Conflict detection functions
export async function fetchCurrentBoardData(
  octokit: Octokit,
  config: GitHubConfig,
  customerId: string
): Promise<{ success: boolean; data?: BoardData; sha?: string; error?: string }> {
  try {
    // First, get the latest commit SHA for the branch
    // This helps bypass GitHub's aggressive content caching
    const { data: refData } = await octokit.rest.git.getRef({
      owner: config.owner,
      repo: config.repo,
      ref: `heads/${config.branch}`
    });
    const latestCommitSha = refData.object.sha;
    
    // Use the commit SHA as the ref instead of branch name
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: `data/${customerId.toLowerCase()}.json`,
      ref: latestCommitSha  // Use commit SHA instead of branch name
    });

    if (Array.isArray(fileData) || !('content' in fileData)) {
      throw new Error('Unexpected response format');
    }

    let content: BoardData;
    
    if (!fileData.content && fileData.sha) {
      const { data: blobData } = await octokit.rest.git.getBlob({
        owner: config.owner,
        repo: config.repo,
        file_sha: fileData.sha
      });
      
      const decodedString = base64ToUtf8(blobData.content.replace(/\n/g, ''));
      content = JSON.parse(decodedString);
    } else {
      const base64Content = fileData.content.replace(/\n/g, '');
      const decodedString = base64ToUtf8(base64Content);
      content = JSON.parse(decodedString);
    }
    
    return { 
      success: true, 
      data: content,
      sha: fileData.sha
    };
  } catch (error: any) {
    console.error('Failed to fetch current data:', error);
    return { 
      success: false, 
      error: 'Failed to fetch current data from GitHub' 
    };
  }
}

function findTaskInColumns(taskId: number, columns: Column[]): { task: Task; columnId: ColumnId } | null {
  for (const column of columns) {
    const task = column.items.find(t => t.id === taskId);
    if (task) {
      return { task, columnId: column.id as ColumnId };
    }
  }
  return null;
}

function tasksAreEqual(task1: Task, task2: Task): boolean {
  return (
    task1.description === task2.description &&
    task1.type === task2.type &&
    task1.device === task2.device &&
    JSON.stringify(task1.feedback || []) === JSON.stringify(task2.feedback || []) &&
    task1.section === task2.section &&
    task1.owner === task2.owner &&
    task1.locked === task2.locked &&
    JSON.stringify(task1.images || []) === JSON.stringify(task2.images || [])
  );
}

export function detectConflicts(
  originalColumns: Column[],
  localColumns: Column[],
  remoteData: BoardData,
  originalVersion?: number,
  force409Conflict: boolean = false
): ConflictData {
  // If this is triggered by a 409, always detect conflicts (don't trust version due to caching)
  // If versions match and not a 409, no conflict
  if (!force409Conflict && originalVersion !== undefined && remoteData.version === originalVersion) {
    return {
      hasConflict: false,
      localChanges: [],
      remoteChanges: []
    };
  }

  const localChanges: TaskChange[] = [];
  const remoteChanges: TaskChange[] = [];
  
  // Get all task IDs from all versions
  const allTaskIds = new Set<number>();
  [...originalColumns, ...localColumns, ...remoteData.columns].forEach(column => {
    column.items.forEach(task => allTaskIds.add(task.id));
  });

  // Compare each task
  allTaskIds.forEach(taskId => {
    const originalLocation = findTaskInColumns(taskId, originalColumns);
    const localLocation = findTaskInColumns(taskId, localColumns);
    const remoteLocation = findTaskInColumns(taskId, remoteData.columns);

    // Task was added locally
    if (!originalLocation && localLocation) {
      localChanges.push({
        task: localLocation.task,
        changeType: 'added',
        toColumn: localLocation.columnId
      });
    }

    // Task was added remotely
    if (!originalLocation && remoteLocation) {
      remoteChanges.push({
        task: remoteLocation.task,
        changeType: 'added',
        toColumn: remoteLocation.columnId
      });
    }

    // Task was deleted locally
    if (originalLocation && !localLocation) {
      localChanges.push({
        task: originalLocation.task,
        changeType: 'deleted',
        fromColumn: originalLocation.columnId
      });
    }

    // Task was deleted remotely
    if (originalLocation && !remoteLocation) {
      remoteChanges.push({
        task: originalLocation.task,
        changeType: 'deleted',
        fromColumn: originalLocation.columnId
      });
    }

    // Task exists in all versions - check for moves or modifications
    if (originalLocation && localLocation && remoteLocation) {
      // Check local changes
      if (originalLocation.columnId !== localLocation.columnId) {
        localChanges.push({
          task: localLocation.task,
          changeType: 'moved',
          fromColumn: originalLocation.columnId,
          toColumn: localLocation.columnId
        });
      } else if (!tasksAreEqual(originalLocation.task, localLocation.task)) {
        localChanges.push({
          task: localLocation.task,
          changeType: 'modified',
          toColumn: localLocation.columnId
        });
      }

      // Check remote changes
      if (originalLocation.columnId !== remoteLocation.columnId) {
        remoteChanges.push({
          task: remoteLocation.task,
          changeType: 'moved',
          fromColumn: originalLocation.columnId,
          toColumn: remoteLocation.columnId
        });
      } else if (!tasksAreEqual(originalLocation.task, remoteLocation.task)) {
        remoteChanges.push({
          task: remoteLocation.task,
          changeType: 'modified',
          toColumn: remoteLocation.columnId
        });
      }
    }
  });

  return {
    hasConflict: force409Conflict || remoteChanges.length > 0,
    localChanges,
    remoteChanges,
    remoteData
  };
}
