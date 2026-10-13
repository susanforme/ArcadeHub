export function Icon({
  name,
  size = 20,
}: {
  name: 'games' | 'save' | 'settings' | 'arrow' | 'sound' | 'search';
  size?: number;
}) {
  const paths = {
    games: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="4" />
        <path d="M7 10v5m-2-2.5h4m6-1h.01m3 3h.01" />
      </>
    ),
    save: (
      <>
        <path d="M4 4h13l3 3v13H4zM8 4v6h8V4M8 20v-6h8v6" />
      </>
    ),
    settings: (
      <>
        <path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3z" />
        <circle cx="12" cy="11" r="3" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    sound: (
      <>
        <path d="M4 9h4l5-4v14l-5-4H4zM17 8q5 4 0 8" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
