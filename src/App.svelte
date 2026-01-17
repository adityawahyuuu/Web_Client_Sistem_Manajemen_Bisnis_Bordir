<script>
  import { Router, navigate } from 'svelte-routing';
  import { isAuthenticated } from './stores/auth.js';
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
  const Invoices = () => import('./pages/Invoices.svelte');
  const Waybills = () => import('./pages/Waybills.svelte');
  const Receipts = () => import('./pages/Receipts.svelte');
  const WhatsAppSettings = () => import('./pages/WhatsAppSettings.svelte');

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];

  $: if (!$isAuthenticated && typeof window !== 'undefined') {
    const path = window.location.pathname;
    const isPublicRoute = publicRoutes.some(route => path.startsWith(route));

    if (!isPublicRoute) {
      navigate('/login', { replace: true });
    }
  }
</script>

<Notification />

<Router>
  {#if $isAuthenticated}
    <!-- Authenticated routes -->
    <div class="flex min-h-screen bg-gray-100">
      <Sidebar />
      <main class="flex-1 p-8">
        <LazyRoute path="/" component={Dashboard} />
        <LazyRoute path="/customers" component={Customers} />
        <LazyRoute path="/invoices" component={Invoices} />
        <LazyRoute path="/waybills" component={Waybills} />
        <LazyRoute path="/receipts" component={Receipts} />
        <LazyRoute path="/whatsapp" component={WhatsAppSettings} />
      </main>
    </div>
  {:else}
    <!-- Public routes -->
    <LazyRoute path="/login" component={Login} />
    <LazyRoute path="/register" component={Register} />
    <LazyRoute path="/verify-email" component={VerifyEmail} />
    <LazyRoute path="/forgot-password" component={ForgotPassword} />
    <LazyRoute path="/reset-password" component={ResetPassword} />
    <LazyRoute path="*" component={Login} />
  {/if}
</Router>