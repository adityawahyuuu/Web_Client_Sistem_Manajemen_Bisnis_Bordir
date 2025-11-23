<script>
  import { notifications, removeNotification } from '../stores/notifications.js';
</script>

<div class="fixed top-4 right-4 z-50 space-y-2">
  {#each $notifications as notification (notification.id)}
    <div
      class="flex items-center gap-3 p-4 rounded-lg shadow-lg max-w-sm {
        notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
        notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
        notification.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
        'bg-blue-50 text-blue-800 border border-blue-200'
      }"
    >
      <span class="flex-1 text-sm">{notification.message}</span>
      <button
        on:click={() => removeNotification(notification.id)}
        class="text-gray-400 hover:text-gray-600"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/each}
</div>
