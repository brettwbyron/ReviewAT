<script lang="ts">
	let { children } = $props();
	let prefersDark = $state(true);
	let isDark = $state(true);

	function switchTheme() {
		const value = isDark ? 'light' : 'dark';

		isDark = value === 'dark';
		localStorage.setItem('sv:theme', isDark === prefersDark ? 'system' : value);
	}

	$effect(() => {
		document.documentElement.classList.remove('light', 'dark');
		prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

		const theme = localStorage.getItem('sv:theme');

		isDark = !theme
			? prefersDark
			: theme === 'dark' || theme === 'system' && prefersDark;

		document.documentElement.classList.add(isDark ? 'dark' : 'light');
	});
</script>

<svelte:head>
	<title>ReviewAT</title>

	<script>
		{ const theme = localStorage.getItem('sv:theme'); document.documentElement.classList.add( !theme || theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' : theme ); }
	</script>
</svelte:head>

<main class="content">{@render children()}</main>
	
<button
	class="theme-toggle-fixed"
	onclick={switchTheme}
	aria-label="Toggle theme"
>
	<span class="theme-toggle-icon"></span>
</button>

<style>
	:global(html) {
		/* Colors */
		--bg-1: #f8f9fc;
		--bg-2: #ffffff;
		--bg-3: #e8eaf0;
		--fg-1: #1e1e1e;
		--fg-2: #444444;
		--fg-3: #aeafad;
		--primary: #3cb7ff;
		--primary-fg: #004770;
		--primary-bg: #b3e3ff;
		--secondary: #6c9;
		--secondary-fg: #1c5438;
		--secondary-bg: #c6ecd9;
		--success: #0d783f;
		--success-fg: #064e3b;
		--success-bg: #bff8d9;
		--info: #3730a3;
		--info-fg: #332e7f;
		--info-bg: #bbdefb;
		--warning: #f59e0b;
		--warning-fg: #92400e;
		--warning-bg: #fef3c7;
		--error: #ef4444;
		--error-fg: #991b1b;
		--error-bg: #ffcdd2;

		/* Gradients */
		--primary-gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
		--primary-gradient--transparent: linear-gradient(135deg, #3cb7ff00 0%, #6c90 100%);
		--primary-gradient--active: linear-gradient(135deg, var(--primary) 80%, var(--secondary) 100%);;
		--success-gradient: linear-gradient(135deg, hsl(148, 76%, 97%) 0%, hsl(148, 84%, 93%) 100%);
		--info-gradient: linear-gradient(135deg, hsl(207, 89%, 96%) 0%, hsl(207, 89%, 86%) 100%);
		--warning-gradient: linear-gradient(135deg, hsl(38, 92%, 95%) 0%, hsl(38, 92%, 85%) 100%);
		--error-gradient: linear-gradient(135deg, hsl(0, 84%, 98%) 0%, hsl(0, 84%, 93%) 100%);

		--border-radius: 8px;
		--font: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
		--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		--primary-shadow-color: rgba(40, 19, 48, 0.2);
		--global-transition: all 0.2s ease;
		color-scheme: light;
		margin: 0;
		background: var(--bg-1);
		color: var(--fg-1);
		font-family: var(--font);
		line-height: 1.6;
		height: calc(100vh - 2rem);
		accent-color: var(--primary) !important;
		min-height: 100vh;
		background-color: var(--bg-1);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(html.dark) {
		color-scheme: dark;
		--bg-1: #0f1117;
		--bg-2: #1e1e1e;
		--bg-3: #444444;
		--fg-1: #f8f9fc;
		--fg-2: #aeafad;
		--fg-3: #8792a8;
		--primary-bg: #004770;
		--primary-fg: #b3e3ff;
		--secondary-bg: #1c5438;
		--secondary-fg: #c6ecd9;
		--success-bg: #064e3b;
		--success-fg: #bff8d9;
		--info-bg: #332e7f;
		--info-fg: #bbdefb;
		--warning-bg: #92400e;
		--warning-fg: #ffe0b2;
		--error-bg: #991b1b;
		--error-fg: #ffcdd2;
		--info: #bbdefb;
		--info-bg: #3730a3;
		--primary-shadow-color: rgba(143, 61, 184, 0.1);
	}

	:global(body) {
		margin: 0;
	}

	main {
		color: var(--fg-1);
		min-height: 100vh;
		width: 100vw;
		display: flex;
		flex-direction: column;
	}

	:global(.container) {
		width: 100%;
		max-width: 1440px;
		margin: 0 auto;
		padding: 2rem 2rem;
		box-sizing: border-box;
		flex: 1;
	}

	.theme-toggle-fixed {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		padding: 0;
		background: var(--bg-2);
		border: 1px solid var(--bg-3);
		border-radius: 50%;
		color: var(--fg-1);
		cursor: pointer;
		transition: var(--global-transition);
		box-shadow: var(--shadow-lg);
		z-index: 1000;
		opacity: 0.7;
	}

	.theme-toggle-fixed:hover {
		transform: scale(1.1);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		border-color: var(--primary);
		opacity: 1;
	}

	.theme-toggle-icon {
		display: inline-block;
		width: 1.5rem;
		height: 1.5rem;
		-webkit-mask-size: 1.5rem;
		mask-size: 1.5rem;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
		-webkit-mask-position: center;
		mask-position: center;
		background-color: var(--fg-1);
	}

	.theme-toggle-icon {
		mask-image: url('data:image/svg+xml,%3csvg%20xmlns="http://www.w3.org/2000/svg"%20viewBox="0%200%2024%2024"%3e%3cpath%20fill="%23666"%20d="M12%2021q-3.775%200-6.388-2.613T3%2012q0-3.45%202.25-5.988T11%203.05q.625-.075.975.45t-.025%201.1q-.425.65-.638%201.375T11.1%207.5q0%202.25%201.575%203.825T16.5%2012.9q.775%200%201.538-.225t1.362-.625q.525-.35%201.075-.037t.475.987q-.35%203.45-2.937%205.725T12%2021Zm0-2q2.2%200%203.95-1.213t2.55-3.162q-.5.125-1%20.2t-1%20.075q-3.075%200-5.238-2.163T9.1%207.5q0-.5.075-1t.2-1q-1.95.8-3.163%202.55T5%2012q0%202.9%202.05%204.95T12%2019Zm-.25-6.75Z"/%3e%3c/svg%3e');
	}

	:global(html.dark) .theme-toggle-icon {
		mask-image: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%3e%3cpath%20fill='%23d4d4d4'%20d='M12%2019a1%201%200%200%201%20.993.883L13%2020v1a1%201%200%200%201-1.993.117L11%2021v-1a1%201%200%200%201%201-1zm6.313-2.09.094.083.7.7a1%201%200%200%201-1.32%201.497l-.094-.083-.7-.7a1%201%200%200%201%201.218-1.567l.102.07zm-11.306.083a1%201%200%200%201%20.083%201.32l-.083.094-.7.7a1%201%200%200%201-1.497-1.32l.083-.094.7-.7a1%201%200%200%201%201.414%200zM4%2011a1%201%200%200%201%20.117%201.993L4%2013H3a1%201%200%200%201-.117-1.993L3%2011h1zm17%200a1%201%200%200%201%20.117%201.993L21%2013h-1a1%201%200%200%201-.117-1.993L20%2011h1zM6.213%204.81l.094.083.7.7a1%201%200%200%201-1.32%201.497l-.094-.083-.7-.7A1%201%200%200%201%206.11%204.74l.102.07zm12.894.083a1%201%200%200%201%20.083%201.32l-.083.094-.7.7a1%201%200%200%201-1.497-1.32l.083-.094.7-.7a1%201%200%200%201%201.414%200zM12%202a1%201%200%200%201%20.993.883L13%203v1a1%201%200%200%201-1.993.117L11%204V3a1%201%200%200%201%201-1zm0%205a5%205%200%201%201-4.995%205.217L7%2012l.005-.217A5%205%200%200%201%2012%207z'/%3e%3c/svg%3e");
	}
</style>