<script lang="ts">
  let {
    element = 'a',
    text = 'Button',
    loadingText,
    title,
    href = '#',
    type = 'primary',
    size = '',
    target = '',
    rel = '',
    disabled=false,
    loading=false,
    onClick
  }: {
    element?: string;
    text?: string;
    loadingText?: string;
    title?: string;
    href?: string;
    type?: string;
    size?: string;
    target?: string;
    rel?: string;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
  } = $props();

  const displayText = $derived(loading && loadingText ? loadingText : text);

  function handleClick(e: MouseEvent) {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  }
</script>

<div>
  <svelte:element
    this={element}
    {...(element === 'a' ? { href, target, rel } : { type: 'button', disabled: disabled || loading })}
    onclickcapture={handleClick}
    class="button button-{type} {size ? `button-${size}` : ''} {loading ? 'button-loading' : ''}"
    role="button"
    title="{title || text}"
  >
    {#if loading}
      <span class="spinner"></span>
    {/if}
    <span class:loading-text={loading}>{displayText}</span>
  </svelte:element>
</div>

<style>
  .button {
    border-radius: var(--border-radius);
    border-width: 2px;
    border-style: solid;
    padding: 13px 25px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    position: relative;
    font-weight: 600;
    font-size: 1rem;
    transition: all .15s ease-in-out;
    line-height: 24px;
    text-decoration: none;
    background-color: transparent;
    cursor: pointer;

    span {
      transition: color .15s ease-in-out;
    }

    &:hover {
      background-color: transparent;
      color: inherit;
    }
  }

  .button-small {
    padding: 8px 32px;
  }

  .button-loading {
    cursor: wait;
    opacity: 0.7;
  }

  .loading-text {
    opacity: 0.7;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    div {
      display: block;
      width: 100%;
    }

    .button {
      width: 100%;
      box-sizing: border-box;
    }
  }

  .button-primary {
    background-color: var(--primary);
    color: var(--bg-2);
    border-color: var(--primary);
  }
  
  .button-secondary {
    background-color: #bcf3ff;
    border-color: #bcf3ff;
    color: var(--bg-2);

    &:hover {
      color: inherit;
    }
  }
  
  .button-cancel {
    background-color: var(--bg-3);
    border-color: var(--bg-3);
    color: var(--fg-1);

    &:hover {
      border-color: var(--primary);
    }
  }
  
  .button-delete {
    background-color: var(--error);
    border-color: var(--error);
    color: #fff;

    &:hover {
      background-color: #fff;
      color: var(--error);
    }
  }

  .button-gradient,
  .button-save {
    background: var(--primary) !important;
    border-color: transparent !important;
    color: var(--bg-1) !important;

    &::after {
      content: '';
      position: absolute;
      padding: 2px;
      margin: -2px;
      inset: 0;
      border-radius: var(--border-radius);
      transition: opacity 0.5s ease;
      opacity: 1;
      background: var(--primary-gradient);
    }

    span {
      z-index: 1;
    }

    &:hover {
      &::after {
        opacity: 0;
      }
    }
  }
  
  .button-hollow {
    background-color: transparent;
    border-color: var(--fg-1);
    color: var(--fg-1);

    &:hover {
      border-color: var(--primary);
    }
  }

  .button-hollow-gradient {
    background: transparent;
    border-color: transparent;
    color: var(--fg-1);

    &::before, &::after {
      content: '';
      position: absolute;
      padding: 2px;
      margin: -2px;
      inset: 0;
      border-radius: var(--border-radius);
    }

    &::before {
      background: var(--primary-gradient);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
    }

    &::after {
      transition: opacity 0.5s ease;
      opacity: 0;
      background: var(--primary-gradient);
    }

    span {
      z-index: 1;
    }

    &:hover {
      &::after {
        opacity: 1;
      }

      span {
        color: var(--bg-1);
      }
    }
  }
</style>