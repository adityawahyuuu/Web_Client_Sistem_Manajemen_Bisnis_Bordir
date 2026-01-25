<script>
  import { createEventDispatcher } from 'svelte';

  export let value = '#2563eb';

  const dispatch = createEventDispatcher();

  const presetColors = [
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#db2777', // Pink
    '#dc2626', // Red
    '#ea580c', // Orange
    '#ca8a04', // Yellow
    '#16a34a', // Green
    '#0d9488', // Teal
    '#0284c7', // Light Blue
    '#4b5563', // Gray
    '#1e293b', // Slate
    '#000000'  // Black
  ];

  function handleColorChange(e) {
    value = e.target.value;
    dispatch('change', value);
  }

  function selectPreset(color) {
    value = color;
    dispatch('change', value);
  }
</script>

<div class="color-picker">
  <div class="flex items-center gap-2 mb-2">
    <input
      type="color"
      {value}
      on:input={handleColorChange}
      class="w-8 h-8 rounded cursor-pointer border border-gray-200"
    />
    <input
      type="text"
      {value}
      on:input={handleColorChange}
      class="flex-1 px-2 py-1 text-sm font-mono border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      placeholder="#000000"
    />
  </div>

  <div class="flex flex-wrap gap-1">
    {#each presetColors as color}
      <button
        type="button"
        class="w-6 h-6 rounded border-2 transition-all {value === color ? 'border-blue-500 scale-110' : 'border-transparent'}"
        style="background-color: {color}"
        on:click={() => selectPreset(color)}
        title={color}
      />
    {/each}
  </div>
</div>

<style>
  input[type="color"] {
    -webkit-appearance: none;
    padding: 0;
  }

  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
  }
</style>
