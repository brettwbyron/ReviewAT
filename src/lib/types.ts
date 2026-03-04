export const TASK_TYPES = ['Change Request', 'Issue', 'Feature'] as const;
export const DEVICE_TYPES = ['All', 'Desktop', 'Mobile'] as const;
export const OWNER_TYPES = ['PM', 'Developer', 'Account'] as const;

export type DeviceType = typeof DEVICE_TYPES[number];
export type TaskType = typeof TASK_TYPES[number];
export type OwnerType = typeof OWNER_TYPES[number];

export type ColumnId = 'todo' | 'inprogress' | 'retest' | 'feedback' | 'approved' | 'cancelled';

export interface FeedbackItem {
	text: string;
	author: 'account' | 'pm' | 'developer';
	createdAt: string;
	editedAt?: string;
}

export interface Task {
	id: number;
	description: string;
	type?: TaskType;
	device: DeviceType;
	feedback: FeedbackItem[];
	section: string;
	owner?: OwnerType;
	createdAt: string;
	updatedAt: string;
	locked?: boolean;
	images?: string[];
}

export interface Column {
	id: ColumnId;
	title: string;
	items: Task[];
}

export interface BoardData {
	displayName?: string;
	uatEndDate?: string;
	devSiteUrl?: string;
	uatFolderUrl?: string;
	contactEmails?: string;
	passwordHash: string;
	version: number;
	columns: Column[];
	disableAddTask: boolean;
}

export interface ModalData {
	description: string;
	type?: TaskType;
	device: DeviceType;
	feedback: FeedbackItem[];
	section: string;
	owner?: OwnerType;
	images: string[];
}

export interface Toast {
	id: number;
	message: string;
	type: 'success' | 'error' | 'info';
}

export interface TaskChange {
	task: Task;
	changeType: 'added' | 'modified' | 'deleted' | 'moved';
	fromColumn?: ColumnId;
	toColumn?: ColumnId;
}

export interface ConflictData {
	hasConflict: boolean;
	localChanges: TaskChange[];
	remoteChanges: TaskChange[];
	remoteData?: BoardData;
}
