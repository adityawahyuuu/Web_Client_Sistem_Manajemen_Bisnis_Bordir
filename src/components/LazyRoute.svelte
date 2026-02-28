<script>
  import { Route, useLocation } from 'svelte-routing';

  export let path;
  export let component;

  const location = useLocation();

  let LoadedComponent = null;
  let loading = false;
  let error = null;

  async function load() {
    if (LoadedComponent || loading) return;

    loading = true;
    error = null;

    try {
      const module = await component();
      LoadedComponent = module.default;
    } catch (err) {
      console.error('Failed to load component:', err);
      error = err;
    } finally {
      loading = false;
    }
  }

  // Exact match for "/" prevents Dashboard from mounting on every sub-route.
  // svelte-routing's <Route path="/"> uses prefix matching so its slot renders
  // on /customers, /invoices, etc. — this guard corrects that behaviour.
  $: isActive = path === '/'
    ? $location.pathname === '/'
    : $location.pathname === path || $location.pathname.startsWith(path + '/');

  // Trigger lazy bundle load only when this route is active
  $: if (isActive) {
    load();
  }
</script>

<Route {path}>
  {#if isActive}
    {#if loading}
      <div class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center min-h-screen text-red-600">
        <p>{error.message}</p>
      </div>
    {:else if LoadedComponent}
      <svelte:component this={LoadedComponent} />
    {/if}
  {/if}
</Route>
