<script>
  import { onMount } from 'svelte';
  import { Router, navigate } from 'svelte-routing';
  import { isAuthenticated, authInitializing, initAuth } from './stores/auth.js';
  import { loadCompanies } from './stores/company.js';
  import Sidebar from './components/Sidebar.svelte';
  import Notification from './components/Notification.svelte';
  import LazyRoute from './components/LazyRoute.svelte';

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
  const publicRoutes = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];

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
    const path = window.location.pathname;
    const isPublicRoute = publicRoutes.some(route => path.startsWith(route));
    if (!isPublicRoute) {
      navigate('/login', { replace: true });
    }
  }
</script>

<Notification />

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
      <main class="flex-1 overflow-y-auto">
        <LazyRoute path="/" component={Dashboard} />
        <LazyRoute path="/customers" component={Customers} />
        <LazyRoute path="/items" component={Items} />
        <LazyRoute path="/invoices" component={Invoices} />
        <LazyRoute path="/waybills" component={Waybills} />
        <LazyRoute path="/receipts" component={Receipts} />
        <LazyRoute path="/companies" component={Companies} />
      </main>
    </div>
  {:else}
    <LazyRoute path="/login" component={Login} />
    <LazyRoute path="/register" component={Register} />
    <LazyRoute path="/verify-email" component={VerifyEmail} />
    <LazyRoute path="/forgot-password" component={ForgotPassword} />
    <LazyRoute path="/reset-password" component={ResetPassword} />
    <LazyRoute path="*" component={Login} />
  {/if}
</Router>
