<script>
  import { Route } from 'svelte-routing';

  export let path;
  export let component;

  let LoadedComponent = null;
  let loading = true;
  let error = null;

  // Load component on mount
  $: if (component) {
    loading = true;
    error = null;

    component()
      .then((module) => {
        LoadedComponent = module.default;
        loading = false;
      })
      .catch((err) => {
        console.error('Failed to load component:', err);
        error = err;
        loading = false;
      });
  }
</script>

<Route {path}>
  {#if loading}
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  {:else if error}
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center text-red-600">
        <p class="text-xl font-semibold">Failed to load page</p>
        <p class="mt-2">{error.message}</p>
      </div>
    </div>
  {:else if LoadedComponent}
    <svelte:component this={LoadedComponent} />
  {/if}
</Route>
