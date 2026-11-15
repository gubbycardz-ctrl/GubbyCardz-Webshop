import type { SVGProps } from "react";

// Decorative line icons – always next to a text label, so they are hidden from screen readers.
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M3 4h2.2l2.3 11h10.3l2.2-8H6.3" />
      <circle cx="9" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </Icon>
  );
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 3l7 3v5.5c0 4.4-2.9 7.9-7 9.5-4.1-1.6-7-5.1-7-9.500V6l7-3z" />
      <path d="M9 12l2.2 2.200L15.2 10" />
    </Icon>
  );
}

export function TruckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M2.5 6.500h11v10h-11zM13.5 10h4l3 3.200v3.300h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </Icon>
  );
}

export function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M10 4l1.7 4.300L16 10l-4.3 1.700L10 16l-1.7-4.300L4 10l4.3-1.700L10 4z" />
      <path d="M18 14l.9 2.100L21 17l-2.1.900L18 20l-.9-2.100L15 17l2.1-.900L18 14z" />
    </Icon>
  );
}
