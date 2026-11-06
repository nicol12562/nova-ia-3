// Íconos de línea (lucide-style), 24 viewBox, stroke currentColor
const PATHS = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  plusSq: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 9v6M9 12h6" /></>,
  crown: <path d="M4 8l4 4 4-6 4 6 4-4-1.5 9.5a1.8 1.8 0 0 1-1.8 1.5H7.3a1.8 1.8 0 0 1-1.8-1.5z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  cpu: <><rect x="7" y="7" width="10" height="10" rx="2" /><rect x="10.5" y="10.5" width="3" height="3" rx=".5" /><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5" /></>,
  pulse: <path d="M3 12h4l2.5-6.5L14 18l2.5-6H21" />,
  sliders: <><path d="M4 8h9M17.5 8H20M4 16h3M11.5 16H20" /><circle cx="15" cy="8" r="2.2" /><circle cx="9" cy="16" r="2.2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" /></>,
  moon: <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.2a2.5 2.5 0 1 1 3.5 2.4c-.8.4-1.1.9-1.1 1.7v.4" /><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none" /></>,
  lock: <><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  sparkle: <path d="M12 3l2 5.6L19.5 10l-5.5 1.4L12 17l-2-5.6L4.5 10l5.5-1.4z" />,
  doc: <><rect x="6" y="3.5" width="12" height="17" rx="2" /><path d="M9.5 8.5h5M9.5 12.5h5M9.5 16.5h3" /></>,
  wand: <><path d="M4 20L13.5 10.5" /><path d="M15.5 4.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9zM19 13l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" /></>,
  knot: <><circle cx="6" cy="12" r="2.3" /><circle cx="17.5" cy="6" r="2.3" /><circle cx="17.5" cy="18" r="2.3" /><path d="M8.2 10.9l7.1-3.7M8.2 13.1l7.1 3.7" /></>,
  bot: <><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 4.5V8" /><circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" /></>,
  send: <path d="M4.5 11.5L20 4.5l-6.5 15.5-2.6-6.4z" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  arrowUpRight: <path d="M7 17L17 7M9.5 7H17v7.5" />,
  chevronDown: <path d="M7 10l5 5 5-5" />,
  chat: <path d="M4.5 7A3.5 3.5 0 0 1 8 3.5h8A3.5 3.5 0 0 1 19.5 7v6a3.5 3.5 0 0 1-3.5 3.5H9.5L5 20.5z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  eyeOff: <><path d="M4 4l16 16" /><path d="M9.9 5.7A10.6 10.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a18 18 0 0 1-3.2 3.9M6.3 7.9A17.6 17.6 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.6-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  logout: <><path d="M9.5 3.5H6A2.5 2.5 0 0 0 3.5 6v12A2.5 2.5 0 0 0 6 20.5h3.5" /><path d="M15 8l4 4-4 4M19 12H9.5" /></>,
  google: null,
};

export function Icon({ name, size = 18, style }) {
  if (name === "google") {
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} style={style}>
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 40.4 44 35 44 24c0-1.3-.1-2.6-.4-3.9z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {PATHS[name]}
    </svg>
  );
}
