import type { SVGProps } from "react";

/** A small set of line icons drawn for Upper Echelon: 24px grid, 1.5px stroke, square caps. */
function Icon({ children, size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement> & { size?: number };

export const BellIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20.5h4" />
  </Icon>
);
export const LetterIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3.5 6h17v12h-17z" />
    <path d="m3.5 6.5 8.5 7 8.5-7" />
  </Icon>
);
export const MenuIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 8h16M4 16h16" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
export const SearchIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m15 15 5 5" />
  </Icon>
);
export const ArrowRightIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Icon>
);
export const ArrowUpIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 20V5M6 11l6-6 6 6" />
  </Icon>
);
export const BookmarkIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6.5 3.5h11v17L12 16l-5.5 4.5z" />
  </Icon>
);
export const FlagIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5.5 21V4M5.5 4h12l-2.5 4.5 2.5 4.5h-12" />
  </Icon>
);
export const LockIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5.5 10.5h13v10h-13z" />
    <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
  </Icon>
);
export const PinIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 3.5h6l-1 6 3 3H7l3-3-1-6ZM12 12.5V21" />
  </Icon>
);
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Icon>
);
export const ImageIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3.5 5h17v14h-17z" />
    <path d="m3.5 16 5-5 4 4 3-3 5 5" />
    <circle cx="15.5" cy="9" r="1.2" />
  </Icon>
);
export const LinkIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Icon>
);
export const QuoteIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 11h4v6H5zM5 11c0-3 1-5 4-6M14 11h4v6h-4zM14 11c0-3 1-5 4-6" />
  </Icon>
);
export const CodeIcon = (p: P) => (
  <Icon {...p}>
    <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
  </Icon>
);
export const SigmaIcon = (p: P) => (
  <Icon {...p}>
    <path d="M18 5H6l6 7-6 7h12" />
  </Icon>
);
export const ListIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11M4 6.5h1M4 12h1M4 17.5h1" />
  </Icon>
);
export const PollIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 6h10M4 12h16M4 18h7" />
  </Icon>
);
export const EyeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
export const PlusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const TrashIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14" />
  </Icon>
);
export const PenIcon = (p: P) => (
  <Icon {...p}>
    <path d="m4 20 1-4L16 5l3 3L8 19l-4 1ZM14 7l3 3" />
  </Icon>
);
export const ShieldIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6l7-2.5Z" />
  </Icon>
);
export const BoldIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 4.5h6a3.5 3.5 0 0 1 0 7H7zM7 11.5h7a4 4 0 0 1 0 8H7z" />
  </Icon>
);
export const ItalicIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10 4.5h8M6 19.5h8M15 4.5l-6 15" />
  </Icon>
);
export const ReplyIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10 6 4 12l6 6M4 12h10a6 6 0 0 1 6 6v1" />
  </Icon>
);
export const ClockIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3.5 2" />
  </Icon>
);
export const ExternalIcon = (p: P) => (
  <Icon {...p}>
    <path d="M13 5h6v6M19 5l-9 9M17 14v5H5V7h5" />
  </Icon>
);
export const SettingsIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Icon>
);
export const MoreIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={2.5} strokeLinecap="round" />
  </Icon>
);
