<script>
  import { onMount } from 'svelte';
  import { Router, navigate } from 'svelte-routing';
  import { isAuthenticated, authInitializing, initAuth } from './stores/auth.js';
  import { loadCompanies } from './stores/company.js';
  import Sidebar from './components/Sidebar.svelte';
  import Notification from './components/Notification.svelte';
  import { sidebarOpen, sidebarCollapsed } from './stores/ui.js';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import LazyRoute from './components/LazyRoute.svelte';
  import { withBasePath, stripBasePath, isPublicRoute } from './lib/router.js';

  // Lazy load pages - Authentication
  const Login = () => import('./pages/Login.svelte');
  const Register = () => import('./pages/Register.svelte');
  const VerifyEmail = () => import('./pages/VerifyEmail.svelte');
  const ForgotPassword = () => import('./pages/ForgotPassword.svelte');
  const ResetPassword = () => import('./pages/ResetPassword.svelte');

  // Lazy load pages - Main App
  const Dashboard = () => import('./pages/Dashboard.svelte');
  const Customers = () => import('./pages/Customers.svelte');
  const Items = () => import('./pages/Items.svelte');
  const Invoices = () => import('./pages/Invoices.svelte');
  const Waybills = () => import('./pages/Waybills.svelte');
  const Receipts = () => import('./pages/Receipts.svelte');
  const Companies = () => import('./pages/Companies.svelte');

  // Track whether companies have been loaded for the current session
  let companiesInitialized = false;

  onMount(() => {
    initAuth();
  });

  // Load companies exactly once after authentication completes
  $: if ($isAuthenticated && !$authInitializing && !companiesInitialized) {
    companiesInitialized = true;
    loadCompanies();
  }

  // Reset flag on logout so companies reload on next login
  $: if (!$isAuthenticated) {
    companiesInitialized = false;
  }

  $: if (!$authInitializing && !$isAuthenticated && typeof window !== 'undefined') {
    const path = stripBasePath(window.location.pathname);
    if (!isPublicRoute(window.location.pathname)) {
      navigate(withBasePath('/login'), { replace: true });
    }
  }
</script>

<Notification />
<ConfirmDialog />

<Router>
  {#if $authInitializing}
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="text-center">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-3 text-gray-500 text-sm">Memuat...</p>
      </div>
    </div>
  {:else if $isAuthenticated}
    <div class="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />
      <main class="flex-1 min-w-0 overflow-y-auto transition-all duration-300">
        <LazyRoute path={withBasePath('/')} component={Dashboard} />
        <LazyRoute path={withBasePath('/customers')} component={Customers} />
        <LazyRoute path={withBasePath('/items')} component={Items} />
        <LazyRoute path={withBasePath('/invoices')} component={Invoices} />
        <LazyRoute path={withBasePath('/waybills')} component={Waybills} />
        <LazyRoute path={withBasePath('/receipts')} component={Receipts} />
        <LazyRoute path={withBasePath('/companies')} component={Companies} />
      </main>
    </div>
  {:else}
    <LazyRoute path={withBasePath('/login')} component={Login} />
    <LazyRoute path={withBasePath('/register')} component={Register} />
    <LazyRoute path={withBasePath('/verify-email')} component={VerifyEmail} />
    <LazyRoute path={withBasePath('/forgot-password')} component={ForgotPassword} />
    <LazyRoute path={withBasePath('/reset-password')} component={ResetPassword} />
    <LazyRoute path={withBasePath('/*')} component={Login} />
  {/if}
</Router>
