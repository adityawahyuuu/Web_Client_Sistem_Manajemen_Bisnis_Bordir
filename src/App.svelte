<script>
  import { Router, Route, navigate } from 'svelte-routing';
  import { isAuthenticated } from './stores/auth.js';
  import Sidebar from './components/Sidebar.svelte';
  import Notification from './components/Notification.svelte';
  import Login from './pages/Login.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Customers from './pages/Customers.svelte';
  import Invoices from './pages/Invoices.svelte';
  import Waybills from './pages/Waybills.svelte';
  import Receipts from './pages/Receipts.svelte';
  import WhatsAppSettings from './pages/WhatsAppSettings.svelte';

  $: if (!$isAuthenticated && typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path !== '/login') {
      navigate('/login', { replace: true });
    }
  }
</script>

<Notification />

<Router>
  {#if $isAuthenticated}
    <div class="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main class="flex-1 p-8">
        <Route path="/" component={Dashboard} />
        <Route path="/customers" component={Customers} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/waybills" component={Waybills} />
        <Route path="/receipts" component={Receipts} />
        <Route path="/whatsapp" component={WhatsAppSettings} />
      </main>
    </div>
  {:else}
    <Route path="/login" component={Login} />
    <Route path="*">
      <Login />
    </Route>
  {/if}
</Router>