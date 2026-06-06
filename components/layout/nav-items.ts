import {
  LayoutDashboard,
  Users,
  Truck,
  ShoppingCart,
  Package,
  Wheat,
  Beef,
  FileText,
  Receipt,
  ClipboardList,
  CreditCard,
  Wallet,
  DollarSign,
  Settings,
  Crown,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon };

// ── Fuente ÚNICA de navegación: la usan el sidebar (desktop) y el menú mobile.
// Agregá un módulo acá y aparece en ambos automáticamente.
export const menuPrincipal: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/proveedores', label: 'Proveedores', icon: Truck },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/silos', label: 'Silos', icon: Wheat },
  { href: '/admin/hacienda', label: 'Hacienda', icon: Beef },
  { href: '/admin/presupuestos', label: 'Presupuestos', icon: FileText },
  { href: '/admin/facturas', label: 'Facturas', icon: Receipt },
  { href: '/admin/remitos', label: 'Remitos', icon: ClipboardList },
  { href: '/admin/cobros', label: 'Cobros', icon: DollarSign },
  { href: '/admin/compras', label: 'Compras', icon: ShoppingCart },
  { href: '/admin/pagos-proveedor', label: 'Pagos a Prov.', icon: Wallet },
  { href: '/admin/cheques', label: 'Cheques', icon: CreditCard },
  { href: '/admin/cuentas-corrientes', label: 'Cta. Corriente', icon: Wallet },
];

export const menuSecundario: NavItem[] = [
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
  { href: '/admin/suscripcion', label: 'Mi plan', icon: Crown },
];
