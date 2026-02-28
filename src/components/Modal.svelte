<script>
  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let title = '';
  export let size = 'md';
  export let shake = false;

  const dispatch = createEventDispatcher();

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  function close() {
    dispatch('close');
  }

  function onAnimationEnd() {
    shake = false;
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen p-4">
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" on:click={close}></div>

      <div
        class="relative bg-white rounded-lg shadow-xl w-full {sizeClasses[size]} {shake ? 'modal-shake' : ''}"
        on:animationend={onAnimationEnd}
      >
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
          <button on:click={close} class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-4">
          <slot></slot>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes modal-shake {
    0%, 100% { transform: translateX(0); }
    15%       { transform: translateX(-10px); }
    30%       { transform: translateX(10px); }
    45%       { transform: translateX(-7px); }
    60%       { transform: translateX(7px); }
    75%       { transform: translateX(-4px); }
    90%       { transform: translateX(4px); }
  }

  .modal-shake {
    animation: modal-shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }
</style>
