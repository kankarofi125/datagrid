export type ShellNavItem = {
  href: string;
  label: string;
  mono: string;
  group: string;
  exact?: boolean;
};

export function isShellNavActive(path: string, item: ShellNavItem) {
  return item.exact
    ? path === item.href
    : path === item.href || path.startsWith(`${item.href}/`);
}

export function groupShellNav(items: readonly ShellNavItem[]) {
  const groups = new Map<string, ShellNavItem[]>();
  for (const item of items) {
    const group = groups.get(item.group) || [];
    group.push(item);
    groups.set(item.group, group);
  }
  return Array.from(groups, ([label, groupedItems]) => ({
    label,
    items: groupedItems,
  }));
}
