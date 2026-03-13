import { useAuth } from '@/composables/useAuth';

// ✅ Central helper
export function useAccessControl() {
  const { roles, permissions } = useAuth();

  const userRoles = roles().map(r => r.toLowerCase()) || [];
  const userPermissions = permissions().map(p => p.toLowerCase()) || [];
  const isSuperAdmin = userRoles.includes('super admin');

  function canAccessRoute(route: any): boolean {
    if (isSuperAdmin) return true;

    const routeRoles = (route.meta?.roles || []).map((r: string) => r.toLowerCase());
    const routePermissions = (route.meta?.permissions || []).map((p: string) => p.toLowerCase());

    const roleDefined = routeRoles.length > 0;
    const permDefined = routePermissions.length > 0;

    const roleMatch = !roleDefined || userRoles.some(role => routeRoles.includes(role));
    const permMatch = !permDefined || userPermissions.some(p => routePermissions.includes(p));

    // 🔑 If BOTH roles & permissions are defined → allow if EITHER matches
    if (roleDefined && permDefined) {
      const hasAnyRole = userRoles.some(role => routeRoles.includes(role));
      const hasAnyPerm = userPermissions.some(p => routePermissions.includes(p));
      return hasAnyRole || hasAnyPerm;
    }

    // Otherwise → whichever is defined must pass
    return roleMatch && permMatch;
  }

  // ✅ Recursive filter for menus
  function filterAllowedRoutes(routes: any[]): any[] {
    return routes
      .map(route => {
        // Recursively filter children first
        const children = route.children ? filterAllowedRoutes(route.children) : [];

        // Include parent if it is accessible OR if it has accessible children
        if (canAccessRoute(route) || children.length > 0) {
          return { ...route, children };
        }

        // Otherwise, skip this route
        return null;
      })
      .filter(Boolean) as any[];
  }

  return { canAccessRoute, filterAllowedRoutes, isSuperAdmin };
}
