// AppShell scopes its 90% zoom to its own subtree (not <body>) specifically so
// Radix portals can render outside it — portaling into <body> directly would
// nest content inside the zoomed subtree and break Floating UI's position math
// (confirmed empirically: ~130px horizontal drift on align="end" dropdowns).
// This sibling root, declared in index.html, sits outside that subtree.
export const getRadixPortalRoot = () => document.getElementById('radix-portal-root') ?? undefined;
